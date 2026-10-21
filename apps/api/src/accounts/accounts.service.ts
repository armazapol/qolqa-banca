import { Injectable, NotFoundException } from '@nestjs/common';
import { maskAccountNumber, maskCard } from '@qolqa/contracts';
import { AuditService } from '../audit/audit.service';
import type { RequestMeta } from '../common/request-context';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AccountModel,
  CardModel,
  HoldingModel,
  MovementPage,
  ProfileModel,
} from './accounts.models';

export const MAX_PAGE_SIZE = 50;

/** Toda consulta filtra por userId: un usuario nunca ve datos de otro (evita IDOR). */
@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async profile(userId: string): Promise<ProfileModel> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      documentMasked: `****${user.documentNumber.slice(-4)}`,
      dailyLimitPenCents: user.dailyLimitPenCents,
      dailyLimitUsdCents: user.dailyLimitUsdCents,
    };
  }

  async accounts(userId: string): Promise<AccountModel[]> {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return accounts.map((account) => ({
      id: account.id,
      type: account.type,
      currency: account.currency,
      alias: account.alias,
      numberMasked: maskAccountNumber(account.number),
      balanceCents: account.balanceCents,
    }));
  }

  /** Paginación por cursor (id del último elemento): estable aunque entren movimientos nuevos. */
  async movements(
    userId: string,
    accountId: string,
    first: number,
    after?: string | null,
  ): Promise<MovementPage> {
    await this.assertOwnership(userId, accountId);
    const take = Math.min(Math.max(first, 1), MAX_PAGE_SIZE);
    const rows = await this.prisma.movement.findMany({
      where: { accountId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(after ? { cursor: { id: after }, skip: 1 } : {}),
    });
    const items = rows.slice(0, take);
    return {
      items,
      nextCursor: rows.length > take ? (items.at(-1)?.id ?? null) : null,
    };
  }

  async cards(userId: string): Promise<CardModel[]> {
    const cards = await this.prisma.card.findMany({ where: { userId } });
    return cards.map((card) => ({
      id: card.id,
      brand: card.brand,
      maskedPan: maskCard(card.bin, card.last4),
      expiry: `${String(card.expiryMonth).padStart(2, '0')}/${String(card.expiryYear).slice(-2)}`,
      status: card.status,
      accountId: card.accountId,
    }));
  }

  async holdings(userId: string): Promise<HoldingModel[]> {
    const holdings = await this.prisma.holding.findMany({
      where: { userId },
      orderBy: { symbol: 'asc' },
    });
    return holdings.map((holding) => ({
      id: holding.id,
      symbol: holding.symbol,
      name: holding.name,
      quantity: holding.quantity.toString(),
      avgPriceUsd: holding.avgPriceUsd.toString(),
    }));
  }

  /** Mostrar el número completo es una acción auditada (ADR-0011). */
  async revealAccountNumber(
    userId: string,
    accountId: string,
    meta: RequestMeta,
  ): Promise<string> {
    const account = await this.assertOwnership(userId, accountId);
    await this.audit.record({
      action: 'ACCOUNT_NUMBER_REVEALED',
      outcome: 'SUCCESS',
      userId,
      meta,
      metadata: { accountId },
    });
    return account.number;
  }

  private async assertOwnership(userId: string, accountId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) throw new NotFoundException('Cuenta no encontrada');
    return account;
  }
}
