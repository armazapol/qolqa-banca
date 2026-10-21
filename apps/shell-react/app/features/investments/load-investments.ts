import {
  INVESTMENTS_REMOTE,
  type InvestmentsRemoteModule,
} from '@qolqa/contracts';
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

/**
 * Import maps en "shim mode" (es-module-shims) en todos los navegadores
 * (ADR-0022): un <script type="importmap"> añadido después de que la página
 * cargó módulos lo rechaza Firefox ("Import maps are not allowed after a
 * module load…"), y aquí el import map se genera al abrir Inversiones.
 * `importmap-shim` no lo interpreta el navegador: es-module-shims resuelve los
 * imports y ejecuta cada módulo desde una URL blob:, que la CSP permite solo en
 * el área privada (isPrivateAreaPath); el nonce cubre los scripts que inyecta.
 */
async function installModuleShims(): Promise<void> {
  // Se asigna sin el tipo del paquete: declara `nonce` como boolean, pero su
  // implementación (y la documentación) espera el valor del nonce.
  Object.assign(window, {
    esmsInitOptions: { shimMode: true, nonce: readDocumentNonce() },
  });
  await import('es-module-shims');
}

/**
 * Carga el microfrontend Angular solo en el navegador y solo al visitar
 * /app/inversiones. El orquestador (≈80 KB) y es-module-shims también se
 * descargan bajo demanda.
 */
export function loadInvestmentsElement(): Promise<void> {
  loading ??= (async () => {
    await installModuleShims();
    const [{ initFederation }, { useShimImportMap }] = await Promise.all([
      import('@softarc/native-federation-orchestrator'),
      import('@softarc/native-federation-orchestrator/options'),
    ]);
    const { loadRemoteModule } = await initFederation(
      {
        [INVESTMENTS_REMOTE.name]: new URL(REMOTE_ENTRY, window.location.href)
          .href,
      },
      { logLevel: 'error', ...useShimImportMap({ shimMode: true }) },
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
