import {
  type ServerToClientEvents,
  type WsTicketResponse,
  WS_NAMESPACES,
} from '@qolqa/contracts';
import { io, type Socket } from 'socket.io-client';
import { apiFetch } from '../api/http';

/**
 * Vercel no reenvía WebSockets: el cliente se conecta directo al BFF (ADR-0012).
 * En desarrollo, VITE_WS_URL apunta a http://localhost:3000.
 */
const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';

export type QolqaSocket = Socket<ServerToClientEvents>;

let fxSocket: QolqaSocket | null = null;
let fxSubscribers = 0;

/** Una sola conexión /fx compartida por todos los componentes (conteo de referencias). */
export function acquireFxSocket(): QolqaSocket {
  fxSocket ??= io(`${WS_URL}${WS_NAMESPACES.fx}`, {
    transports: ['websocket'],
  });
  fxSubscribers += 1;
  return fxSocket;
}

export function releaseFxSocket(): void {
  fxSubscribers -= 1;
  if (fxSubscribers <= 0 && fxSocket) {
    fxSocket.disconnect();
    fxSocket = null;
    fxSubscribers = 0;
  }
}

/**
 * Notificaciones privadas. `auth` es una función: Socket.IO la llama en cada
 * (re)conexión, así cada intento usa un ticket nuevo de un solo uso.
 */
export function createNotificationsSocket(): QolqaSocket {
  return io(`${WS_URL}${WS_NAMESPACES.notifications}`, {
    transports: ['websocket'],
    auth: (callback) => {
      apiFetch<WsTicketResponse>('/api/auth/ws-ticket', { method: 'POST' })
        .then(({ ticket }) => callback({ ticket }))
        .catch(() => callback({}));
    },
  });
}
