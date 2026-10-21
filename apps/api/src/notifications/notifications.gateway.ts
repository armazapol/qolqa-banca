import { Logger } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { type ServerToClientEvents, WS_NAMESPACES } from '@qolqa/contracts';
import type { Namespace, Socket } from 'socket.io';
import { WsTicketService } from '../auth/ws-ticket.service';

interface SocketData {
  userId: string;
}

type NotificationsNamespace = Namespace<
  Record<string, never>,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

/**
 * Notificaciones privadas en tiempo real (ADR-0011: aviso de cada operación).
 * El ticket de un solo uso se valida en el handshake: una conexión sin ticket
 * válido nunca llega a establecerse (connect_error en el cliente).
 */
@WebSocketGateway({ namespace: WS_NAMESPACES.notifications })
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  private readonly server!: NotificationsNamespace;

  constructor(private readonly wsTickets: WsTicketService) {}

  afterInit(namespace: NotificationsNamespace): void {
    namespace.use((socket, next) => {
      const userId = this.wsTickets.consume(socket.handshake.auth?.['ticket']);
      if (!userId) {
        this.logger.warn('Conexión WebSocket rechazada: ticket inválido');
        return next(new Error('No autorizado'));
      }
      socket.data.userId = userId;
      next();
    });
  }

  async handleConnection(
    client: Socket<
      Record<string, never>,
      ServerToClientEvents,
      Record<string, never>,
      SocketData
    >,
  ): Promise<void> {
    await client.join(this.room(client.data.userId));
  }

  notifyUser<E extends keyof ServerToClientEvents>(
    userId: string,
    event: E,
    ...payload: Parameters<ServerToClientEvents[E]>
  ): void {
    this.server.to(this.room(userId)).emit(event, ...payload);
  }

  private room(userId: string): string {
    return `user:${userId}`;
  }
}
