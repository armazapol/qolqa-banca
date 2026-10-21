import { useCallback, useEffect, useRef, useState } from 'react';

const ACTIVITY_EVENTS = [
  'pointerdown',
  'keydown',
  'scroll',
  'touchstart',
] as const;
const CHANNEL = 'qolqa-activity';
const BROADCAST_THROTTLE_MS = 5_000;

interface IdleOptions {
  warnAfterMs: number;
  timeoutMs: number;
  onTimeout: () => void;
}

/**
 * Cierre de sesión por inactividad (ADR-0011).
 * - Usa la hora real (no setTimeout acumulados): funciona aunque el navegador
 *   ralentice los timers de una pestaña en segundo plano.
 * - Durante el aviso, solo el botón "Seguir conectado" extiende la sesión.
 * - La actividad se comparte entre pestañas con BroadcastChannel.
 */
export function useIdleTimeout({
  warnAfterMs,
  timeoutMs,
  onTimeout,
}: IdleOptions) {
  const [warning, setWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(
    Math.ceil((timeoutMs - warnAfterMs) / 1000),
  );
  const lastActivity = useRef(Date.now());
  const warningRef = useRef(false);
  const onTimeoutRef = useRef(onTimeout);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const markActive = useCallback((broadcast: boolean) => {
    const now = Date.now();
    const shouldBroadcast =
      broadcast && now - lastActivity.current > BROADCAST_THROTTLE_MS;
    lastActivity.current = now;
    warningRef.current = false;
    setWarning(false);
    if (shouldBroadcast) channelRef.current?.postMessage(now);
  }, []);

  useEffect(() => {
    const channel =
      typeof BroadcastChannel === 'undefined'
        ? null
        : new BroadcastChannel(CHANNEL);
    channelRef.current = channel;
    channel?.addEventListener('message', () => markActive(false));

    const onActivity = () => {
      if (!warningRef.current) markActive(true);
    };
    for (const event of ACTIVITY_EVENTS)
      window.addEventListener(event, onActivity, { passive: true });

    const interval = window.setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= timeoutMs) {
        window.clearInterval(interval);
        onTimeoutRef.current();
      } else if (idle >= warnAfterMs) {
        warningRef.current = true;
        setWarning(true);
        setSecondsLeft(Math.ceil((timeoutMs - idle) / 1000));
      }
    }, 1_000);

    return () => {
      for (const event of ACTIVITY_EVENTS)
        window.removeEventListener(event, onActivity);
      window.clearInterval(interval);
      channel?.close();
    };
  }, [markActive, timeoutMs, warnAfterMs]);

  return { warning, secondsLeft, stayActive: () => markActive(true) };
}
