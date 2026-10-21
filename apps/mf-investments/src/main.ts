import { initFederation } from '@angular-architects/native-federation';

/**
 * Arranque aislado del remote (nx serve mf-investments). Integrado en el shell,
 * este archivo no se usa: el shell carga directamente el módulo ./Element.
 */
initFederation({}, { hostRemoteEntry: { url: './remoteEntry.json' } })
  .then(() => import('./bootstrap'))
  .catch((error: unknown) => console.error(error));
