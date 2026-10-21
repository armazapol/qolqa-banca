import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { fxHistoryPointSchema, officialFxRateSchema } from '@qolqa/contracts';
import { z } from 'zod';
import { FxHistoryChart } from '../../features/fx/FxHistoryChart';
import { FxLiveQuote } from '../../features/fx/FxLiveQuote';
import type { Route } from './+types/tipo-de-cambio';

/** URL del BFF desde el servidor (en el navegador se usa /api por el proxy). */
const API_URL = process.env.API_URL ?? 'http://localhost:3000/api';
const TIMEOUT_MS = 5_000;

async function getJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`BFF respondió ${response.status}`);
  return schema.parse(await response.json());
}

/**
 * SSR (ADR-0004): dato público, útil para SEO y que cambia a diario.
 * Si el BFF no responde (p. ej. arranque en frío de Render) la página igual
 * se muestra, con un aviso, en vez de fallar.
 */
export async function loader() {
  try {
    const [official, history] = await Promise.all([
      getJson('/fx/official', officialFxRateSchema),
      getJson('/fx/history', z.array(fxHistoryPointSchema)),
    ]);
    return { official, history };
  } catch {
    return { official: null, history: [] };
  }
}

// Caché en la CDN de Vercel: 5 min fresco y 10 min sirviendo la copia anterior mientras se renueva.
export function headers(): HeadersInit {
  return {
    'Cache-Control':
      'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
  };
}

export const meta: Route.MetaFunction = ({ data }) => {
  const sell = data?.official?.sell.toFixed(3);
  return [
    { title: `Tipo de cambio hoy${sell ? `: S/ ${sell}` : ''} · Qolqa` },
    {
      name: 'description',
      content: `Tipo de cambio del dólar en Perú según el BCRP${sell ? `: venta S/ ${sell}` : ''}, con cotización Qolqa en tiempo real.`,
    },
  ];
};

const rate = (value: number) => value.toFixed(3);

export default function TipoDeCambio({ loaderData }: Route.ComponentProps) {
  const { official, history } = loaderData;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-2">
        <Typography variant="h1">Tipo de cambio hoy</Typography>
        <Typography color="text.secondary">
          Referencia oficial del Banco Central de Reserva del Perú (BCRP), tipo
          de cambio del sistema bancario SBS.
        </Typography>
      </header>

      {official ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card component="section" aria-labelledby="fx-official-title">
            <CardContent className="flex flex-col gap-4">
              <Typography id="fx-official-title" variant="h3" component="h2">
                Oficial BCRP · {official.date}
              </Typography>
              <dl className="m-0 grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm opacity-75">Compra</dt>
                  <dd className="m-0 text-3xl font-semibold tabular-nums">
                    {rate(official.buy)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm opacity-75">Venta</dt>
                  <dd className="m-0 text-3xl font-semibold tabular-nums">
                    {rate(official.sell)}
                  </dd>
                </div>
              </dl>
              <Typography variant="caption" color="text.secondary">
                Fuente: BCRP, series PD04639PD y PD04640PD.
              </Typography>
            </CardContent>
          </Card>
          <FxLiveQuote />
        </div>
      ) : (
        <Alert severity="info">
          El tipo de cambio oficial no está disponible en este momento. Vuelve a
          intentarlo en unos minutos.
        </Alert>
      )}

      {history.length > 0 && (
        <section
          aria-labelledby="fx-history-title"
          className="flex flex-col gap-4"
        >
          <Typography id="fx-history-title" variant="h2">
            Evolución reciente
          </Typography>
          <FxHistoryChart points={history} />
        </section>
      )}
    </div>
  );
}
