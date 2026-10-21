import { Logger, OnModuleDestroy } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  type ServerToClientEvents,
  WS_EVENTS,
  WS_NAMESPACES,
} from '@qolqa/contracts';
import type { Namespace, Socket } from 'socket.io';
import { FxService } from './fx.service';

const TICK_MS = 3_000;

/** Difunde la cotización simulada a todos los clientes (dato público, sin auth). */
@WebSocketGateway({ namespace: WS_NAMESPACES.fx })
export class FxGateway
  implements OnGatewayInit, OnGatewayConnection, OnModuleDestroy
{
  private readonly logger = new Logger(FxGateway.name);
  private timer?: NodeJS.Timeout;

  @WebSocketServer()
  private readonly server!: Namespace<
    Record<string, never>,
    ServerToClientEvents
  >;

  constructor(private readonly fx: FxService) {}

  afterInit(): void {
    this.timer = setInterval(() => this.broadcast(), TICK_MS);
  }

  handleConnection(client: Socket): void {
    try {
      client.emit(WS_EVENTS.fxQuote, this.fx.currentQuote());
    } catch {
      // Aún no hay dato oficial: el cliente recibirá el próximo tick.
    }
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  private broadcast(): void {
    // Sin clientes conectados no se calcula nada.
    if (this.server.sockets.size === 0) return;
    try {
      this.server.emit(WS_EVENTS.fxQuote, this.fx.tick());
    } catch (error) {
      this.logger.debug({ err: error }, 'Cotización no disponible todavía');
    }
  }
}
