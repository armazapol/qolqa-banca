import { Injectable } from '@nestjs/common';
import { randomToken } from '../common/security/tokens';
import { WS_TICKET_TTL_MS } from './auth.constants';

/**
 * Tickets de un solo uso para autenticar el WebSocket sin exponer el access
 * token en la URL (ADR-0012). En memoria: válido mientras haya una sola
 * instancia del BFF; con varias réplicas debería moverse a Redis.
 */
@Injectable()
export class WsTicketService {
  private readonly tickets = new Map<
    string,
    { userId: string; expiresAt: number }
  >();

  issue(userId: string): string {
    this.purgeExpired();
    const ticket = randomToken();
    this.tickets.set(ticket, {
      userId,
      expiresAt: Date.now() + WS_TICKET_TTL_MS,
    });
    return ticket;
  }

  consume(ticket: unknown): string | null {
    if (typeof ticket !== 'string') return null;
    const entry = this.tickets.get(ticket);
    this.tickets.delete(ticket);
    return entry && entry.expiresAt > Date.now() ? entry.userId : null;
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [ticket, entry] of this.tickets) {
      if (entry.expiresAt <= now) this.tickets.delete(ticket);
    }
  }
}
