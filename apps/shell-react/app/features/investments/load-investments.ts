import {
  INVESTMENTS_REMOTE,
  type InvestmentsRemoteModule,
} from '@qolqa/contracts';

/**
 * El remote se sirve bajo el mismo origen que el shell (ADR-0020):
 * proxy de Vite en desarrollo y rewrite de Vercel en producción.
 * Sin CORS y con una CSP `script-src 'self'` posible.
 */
const REMOTE_ENTRY =
  import.meta.env.VITE_INVESTMENTS_REMOTE_ENTRY ??
  '/mf/investments/remoteEntry.json';

let loading: Promise<void> | null = null;

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
      { logLevel: 'error' },
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
