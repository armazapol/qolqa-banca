import { createContext, type ReactNode, useContext } from 'react';

/**
 * Nonce de la CSP del documento actual.
 * - Servidor: lo provee entry.server (uno distinto por petición).
 * - Navegador: se lee de un script que ya lo tiene; el valor coincide con el
 *   del servidor, así la hidratación no detecta diferencias.
 * El navegador oculta el atributo `nonce` del DOM: solo es legible por JS.
 */
const NonceContext = createContext<string | undefined>(undefined);

export function NonceProvider({
  nonce,
  children,
}: {
  nonce: string | undefined;
  children: ReactNode;
}) {
  return (
    <NonceContext.Provider value={nonce}>{children}</NonceContext.Provider>
  );
}

export function readDocumentNonce(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return (
    document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce ||
    undefined
  );
}

export function useNonce(): string | undefined {
  return useContext(NonceContext) ?? readDocumentNonce();
}
