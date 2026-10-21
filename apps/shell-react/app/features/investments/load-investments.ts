import {
  INVESTMENTS_REMOTE,
  type InvestmentsRemoteModule,
} from '@qolqa/contracts';
import type * as Orchestrator from '@softarc/native-federation-orchestrator';
import { readDocumentNonce } from '../../lib/csp/nonce';

/**
 * El remote se sirve bajo el mismo origen que el shell (ADR-0020):
 * proxy de Vite en desarrollo y rewrite de Vercel en producción.
 * Sin CORS y con una CSP `script-src 'self'` posible.
 */
const REMOTE_ENTRY =
  import.meta.env.VITE_INVESTMENTS_REMOTE_ENTRY ??
  '/mf/investments/remoteEntry.json';

let loading: Promise<void> | null = null;

type SetImportMap = NonNullable<
  NonNullable<
    Parameters<typeof Orchestrator.initFederation>[1]
  >['setImportMapFn']
>;

/**
 * Igual que el setImportMapFn por defecto del orquestador, pero el <script
 * type="importmap"> lleva el nonce del documento: la CSP (ADR-0021) no admite
 * scripts inline sin nonce y el import map se genera en tiempo de ejecución.
 */
const setImportMapWithNonce: SetImportMap = (importMap, opts = {}) => {
  if (opts.override) {
    document.head
      .querySelectorAll('script[type="importmap"]')
      .forEach((script) => script.remove());
  }
  const script = document.createElement('script');
  script.type = 'importmap';
  const nonce = readDocumentNonce();
  if (nonce) script.nonce = nonce;
  script.text = JSON.stringify(importMap);
  document.head.appendChild(script);
  return Promise.resolve(importMap);
};

/**
 * Carga el microfrontend Angular solo en el navegador y solo al visitar
 * /app/inversiones. El orquestador (≈80 KB) también se descarga bajo demanda.
 */
export function loadInvestmentsElement(): Promise<void> {
  loading ??= (async () => {
    const { initFederation } =
      await import('@softarc/native-federation-orchestrator');
    const { loadRemoteModule } = await initFederation(
      {
        [INVESTMENTS_REMOTE.name]: new URL(REMOTE_ENTRY, window.location.href)
          .href,
      },
      { logLevel: 'error', setImportMapFn: setImportMapWithNonce },
    );
    const remote = await loadRemoteModule<InvestmentsRemoteModule>(
      INVESTMENTS_REMOTE.name,
      INVESTMENTS_REMOTE.module,
    );
    await remote.defineInvestmentsElement();
  })().catch((error: unknown) => {
    // Permite reintentar (p. ej. si el remote estaba desplegándose).
    loading = null;
    throw error;
  });
  return loading;
}
