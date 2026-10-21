import { type ReactNode, useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

/**
 * Renderiza children solo en el navegador. El fallback debe reservar el mismo
 * espacio para no provocar saltos de layout (CLS).
 */
export function ClientOnly({
  children,
  fallback,
}: {
  children: () => ReactNode;
  fallback: ReactNode;
}) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return hydrated ? children() : fallback;
}
