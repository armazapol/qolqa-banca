import {
  type BankFxQuote,
  bankFxQuoteSchema,
  WS_EVENTS,
} from '@qolqa/contracts';
import { useEffect, useState } from 'react';
import { acquireFxSocket, releaseFxSocket } from '../../lib/realtime/sockets';

export type FxConnection = 'connecting' | 'live' | 'offline';

/** Cotización del banco en tiempo real por WebSocket (ADR-0017). */
export function useFxQuote(initial?: BankFxQuote | null) {
  const [quote, setQuote] = useState<BankFxQuote | null>(initial ?? null);
  const [status, setStatus] = useState<FxConnection>('connecting');

  useEffect(() => {
    const socket = acquireFxSocket();
    const onQuote = (payload: unknown) => {
      // Los datos que llegan por la red se validan aunque vengan de nuestro BFF.
      const parsed = bankFxQuoteSchema.safeParse(payload);
      if (parsed.success) setQuote(parsed.data);
    };
    const onConnect = () => setStatus('live');
    const onDisconnect = () => setStatus('offline');

    if (socket.connected) setStatus('live');
    socket.on(WS_EVENTS.fxQuote, onQuote);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onDisconnect);

    return () => {
      socket.off(WS_EVENTS.fxQuote, onQuote);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onDisconnect);
      releaseFxSocket();
    };
  }, []);

  return { quote, status };
}
