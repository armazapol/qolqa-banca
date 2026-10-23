import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';

/**
 * El CORS de Socket.IO se define aquí (y no en el decorador del gateway)
 * porque depende de la configuración validada en tiempo de arranque.
 */
export class SocketIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly isAllowedOrigin: (origin: string | undefined) => boolean,
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions): unknown {
    return super.createIOServer(port, {
      ...options,
      cors: {
        origin: (
          origin: string | undefined,
          callback: (error: Error | null, allow?: boolean) => void,
        ) => callback(null, this.isAllowedOrigin(origin)),
        credentials: false,
      },
      // Solo WebSocket: evita el long-polling, que necesitaría sesiones pegajosas.
      transports: ['websocket'],
      maxHttpBufferSize: 16 * 1024,
    });
  }
}
