import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  type CreateTransferRequest,
  maskAccountNumber,
  toCents,
  type TransferResponse,
  WS_EVENTS,
} from '@qolqa/contracts';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import type { RequestMeta } from '../common/request-context';
import { startOfLimaDay } from '../common/time';
import { Prisma, type Transfer } from '../generated/prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { PrismaService } from '../prisma/prisma.service';

const MAX_SERIALIZATION_RETRIES = 3;

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsGateway,
  ) {}

  async create(
    userId: string,
    dto: CreateTransferRequest,
    idempotencyKey: string,
    meta: RequestMeta,
  ): Promise<TransferResponse> {
    // Idempotencia: un reintento con la misma clave devuelve el resultado original.
    const previous = await this.prisma.transfer.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
    });
    if (previous) return this.toResponse(previous, dto.toAccountNumber);

    // Autenticación reforzada: cada transferencia exige un código TOTP nuevo (ADR-0011).
    await this.auth.verifyStepUp(userId, dto.otp, meta, 'TRANSFER');

    const amountCents = toCents(dto.amount);
    try {
      const transfer = await this.executeWithRetry(
        userId,
        dto,
        amountCents,
        idempotencyKey,
      );
      await this.audit.record({
        action: 'TRANSFER',
        outcome: 'SUCCESS',
        userId,
        meta,
        metadata: {
          transferId: transfer.id,
          amountCents,
          currency: transfer.currency,
        },
      });
      this.notify(transfer);
      return this.toResponse(transfer, dto.toAccountNumber);
    } catch (error) {
      await this.audit.record({
        action: 'TRANSFER',
        outcome: 'FAILURE',
        userId,
        meta,
        metadata: {
          amountCents,
          reason: error instanceof Error ? error.message : 'unknown',
        },
      });
      throw error;
    }
  }

  /**
   * Aislamiento SERIALIZABLE: el límite diario y el saldo se validan dentro de
   * la misma transacción, así dos transferencias simultáneas no pueden superarlos.
   */
  private async executeWithRetry(
    userId: string,
    dto: CreateTransferRequest,
    amountCents: number,
    idempotencyKey: string,
  ): Promise<Transfer> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.prisma.$transaction(
          (tx) => this.execute(tx, userId, dto, amountCents, idempotencyKey),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        const serializationFailure =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034';
        if (!serializationFailure || attempt >= MAX_SERIALIZATION_RETRIES)
          throw error;
      }
    }
  }

  private async execute(
    tx: Prisma.TransactionClient,
    userId: string,
    dto: CreateTransferRequest,
    amountCents: number,
    idempotencyKey: string,
  ): Promise<Transfer> {
    const from = await tx.account.findFirst({
      where: { id: dto.fromAccountId, userId },
    });
    if (!from) throw new NotFoundException('Cuenta de origen no encontrada');

    const to = await tx.account.findUnique({
      where: { number: dto.toAccountNumber },
    });
    if (!to)
      throw new NotFoundException('La cuenta de destino no existe en Qolqa');
    if (to.id === from.id)
      throw new BadRequestException(
        'Las cuentas de origen y destino son iguales',
      );
    if (to.currency !== from.currency) {
      throw new BadRequestException(
        'Solo se permiten transferencias en la misma moneda',
      );
    }

    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const dailyLimit =
      from.currency === 'PEN'
        ? user.dailyLimitPenCents
        : user.dailyLimitUsdCents;
    const { _sum } = await tx.transfer.aggregate({
      where: {
        userId,
        currency: from.currency,
        createdAt: { gte: startOfLimaDay() },
      },
      _sum: { amountCents: true },
    });
    if ((_sum.amountCents ?? 0) + amountCents > dailyLimit) {
      throw new UnprocessableEntityException(
        'La operación supera tu límite diario de transferencias',
      );
    }

    // Débito condicional: la propia sentencia garantiza que el saldo no quede negativo.
    const debited = await tx.account.updateMany({
      where: { id: from.id, balanceCents: { gte: amountCents } },
      data: { balanceCents: { decrement: amountCents } },
    });
    if (debited.count === 0)
      throw new UnprocessableEntityException('Saldo insuficiente');

    const credited = await tx.account.update({
      where: { id: to.id },
      data: { balanceCents: { increment: amountCents } },
    });
    const fromBalance = from.balanceCents - amountCents;

    const transfer = await tx.transfer.create({
      data: {
        userId,
        fromAccountId: from.id,
        toAccountId: to.id,
        toAccountNumber: to.number,
        amountCents,
        currency: from.currency,
        description: dto.description || 'Transferencia',
        idempotencyKey,
      },
    });

    await tx.movement.createMany({
      data: [
        {
          accountId: from.id,
          type: 'DEBIT',
          amountCents,
          balanceAfterCents: fromBalance,
          description: transfer.description,
          counterparty: maskAccountNumber(to.number),
          transferId: transfer.id,
        },
        {
          accountId: to.id,
          type: 'CREDIT',
          amountCents,
          balanceAfterCents: credited.balanceCents,
          description: transfer.description,
          counterparty: maskAccountNumber(from.number),
          transferId: transfer.id,
        },
      ],
    });

    return transfer;
  }

  private notify(transfer: Transfer): void {
    const payload = {
      transferId: transfer.id,
      amountCents: transfer.amountCents,
      currency: transfer.currency,
      accountNumberMasked: maskAccountNumber(transfer.toAccountNumber),
      createdAt: transfer.createdAt.toISOString(),
    };
    this.notifications.notifyUser(
      transfer.userId,
      WS_EVENTS.transferCompleted,
      payload,
    );
    if (transfer.toAccountId) {
      void this.prisma.account
        .findUnique({
          where: { id: transfer.toAccountId },
          select: { userId: true },
        })
        .then((account) => {
          if (account && account.userId !== transfer.userId) {
            this.notifications.notifyUser(
              account.userId,
              WS_EVENTS.transferReceived,
              payload,
            );
          }
        });
    }
  }

  private toResponse(
    transfer: Transfer,
    requestedAccount: string,
  ): TransferResponse {
    if (transfer.toAccountNumber !== requestedAccount) {
      throw new ConflictException(
        'La clave de idempotencia ya se usó con otra operación',
      );
    }
    return {
      id: transfer.id,
      status: 'COMPLETED',
      amountCents: transfer.amountCents,
      currency: transfer.currency,
      toAccountNumberMasked: maskAccountNumber(transfer.toAccountNumber),
      createdAt: transfer.createdAt.toISOString(),
    };
  }
}
