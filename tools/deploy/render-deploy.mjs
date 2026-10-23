/**
 * Despliega en Render el commit indicado y espera a que quede activo (ADR-0023).
 * El servicio tiene el auto-deploy desactivado: solo GitHub Actions despliega,
 * después de que la CI pase y de aplicar las migraciones.
 *
 * Uso: RENDER_API_KEY=… RENDER_SERVICE_ID=… node tools/deploy/render-deploy.mjs <sha>
 */
const API = 'https://api.render.com/v1';
const FINAL_OK = new Set(['live']);
const FINAL_KO = new Set([
  'build_failed',
  'update_failed',
  'pre_deploy_failed',
  'canceled',
  'deactivated',
]);
const POLL_MS = 15_000;
const TIMEOUT_MS = 20 * 60_000;

const apiKey = process.env.RENDER_API_KEY;
const serviceId = process.env.RENDER_SERVICE_ID;
const commitId = process.argv[2];
if (!apiKey || !serviceId || !commitId) {
  console.error('Faltan RENDER_API_KEY, RENDER_SERVICE_ID o el commit');
  process.exit(1);
}

async function render(path, init = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${apiKey}`,
      accept: 'application/json',
      'content-type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Render ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

const deploy = await render(`/services/${serviceId}/deploys`, {
  method: 'POST',
  body: JSON.stringify({ commitId, clearCache: 'do_not_clear' }),
});
console.log(`Deploy ${deploy.id} del commit ${commitId.slice(0, 7)}`);

const deadline = Date.now() + TIMEOUT_MS;
let status = deploy.status;
while (!FINAL_OK.has(status) && !FINAL_KO.has(status)) {
  if (Date.now() > deadline) throw new Error('Tiempo de espera agotado');
  await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  ({ status } = await render(`/services/${serviceId}/deploys/${deploy.id}`));
  console.log(`  estado: ${status}`);
}

if (!FINAL_OK.has(status)) {
  console.error(`El despliegue terminó en "${status}"`);
  process.exit(1);
}
console.log('✔ BFF desplegado');
