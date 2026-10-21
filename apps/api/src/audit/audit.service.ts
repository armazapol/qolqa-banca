import { Injectable, Logger } from '@nestjs/common';
import type { RequestMeta } from '../common/request-context';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuditAction =
  | 'LOGIN_PASSWORD'
  | 'LOGIN_OTP'
  | 'ACCOUNT_LOCKED'
  | 'TOKEN_REFRESH'
  | 'TOKEN_REUSE_DETECTED'
  | 'LOGOUT'
  | 'TRANSFER'
  | 'ACCOUNT_NUMBER_REVEALED';

interface AuditEntry {
  action: AuditAction;
  outcome: 'SUCCESS' | 'FAILURE';
  userId?: string | null;
  meta?: RequestMeta;
  metadata?: Prisma.InputJsonObject;
}

/**
 * Trazabilidad de operaciones sensibles (ADR-0011). Un fallo al auditar
 * nunca debe tumbar la operación principal, pero sí quedar en los logs.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          outcome: entry.outcome,
          userId: entry.userId ?? null,
          ip: entry.meta?.ip ?? null,
          userAgent: entry.meta?.userAgent ?? null,
          metadata: entry.metadata,
        },
      });
    } catch (error) {
      this.logger.error(
        { err: error, action: entry.action },
        'No se pudo registrar la auditoría',
      );
    }
  }
}
