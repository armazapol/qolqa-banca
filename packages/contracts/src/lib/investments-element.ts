/**
 * Contrato entre el shell React y el microfrontend Angular (ADR-0010).
 * El shell solo conoce un elemento HTML estándar: <bank-investments>.
 */
export const INVESTMENTS_ELEMENT_TAG = 'bank-investments';

/** Nombre del remote y módulo expuesto en Native Federation (ADR-0020). */
export const INVESTMENTS_REMOTE = {
  name: 'mf-investments',
  module: './Element',
} as const;

/** Shell → remote: propiedades JS del elemento (nunca atributos: el token no toca el DOM). */
export interface InvestmentsElementProps {
  /** Devuelve un access token vigente; el shell lo renueva si hace falta. */
  getAccessToken: () => Promise<string | null>;
  /** Base del BFF, p. ej. "/api" (mismo origen). */
  apiBaseUrl: string;
}

/** Remote → shell: CustomEvent con bubbles + composed (atraviesan el Shadow DOM). */
export const INVESTMENTS_EVENTS = {
  navigate: 'investments:navigate',
  error: 'investments:error',
  analytics: 'investments:analytics',
} as const;

export interface InvestmentsEventDetail {
  [INVESTMENTS_EVENTS.navigate]: { to: string };
  [INVESTMENTS_EVENTS.error]: {
    message: string;
    kind: 'auth' | 'network' | 'unknown';
  };
  [INVESTMENTS_EVENTS.analytics]: {
    name: string;
    params?: Record<string, string | number>;
  };
}

/** Módulo expuesto por el remote: registra el custom element (idempotente). */
export interface InvestmentsRemoteModule {
  defineInvestmentsElement: () => Promise<void>;
}
