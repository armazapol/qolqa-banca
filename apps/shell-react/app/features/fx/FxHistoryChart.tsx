import Skeleton from '@mui/material/Skeleton';
import type { FxHistoryPoint } from '@qolqa/contracts';
import { lazy, Suspense } from 'react';
import { ClientOnly } from '../../components/ClientOnly';

// ~85 KB gzip: se descarga después de hidratar para no penalizar LCP ni INP.
const LineChart = lazy(() =>
  import('@mui/x-charts/LineChart').then((module) => ({
    default: module.LineChart,
  })),
);

const CHART_HEIGHT = 280;
const dateLabel = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
});

/**
 * Evolución del tipo de cambio venta. El gráfico se dibuja solo en el cliente,
 * pero el Skeleton reserva la misma altura (sin CLS). Debajo va una tabla
 * equivalente para lectores de pantalla (WCAG 1.1.1).
 */
export function FxHistoryChart({ points }: { points: FxHistoryPoint[] }) {
  const dates = points.map((point) => new Date(`${point.date}T00:00:00Z`));

  return (
    <figure className="m-0">
      <ClientOnly
        fallback={<Skeleton variant="rounded" height={CHART_HEIGHT} />}
      >
        {() => (
          <div aria-hidden="true">
            <Suspense
              fallback={<Skeleton variant="rounded" height={CHART_HEIGHT} />}
            >
              <LineChart
                height={CHART_HEIGHT}
                xAxis={[
                  {
                    data: dates,
                    scaleType: 'time',
                    valueFormatter: (d: Date) => dateLabel.format(d),
                  },
                ]}
                yAxis={[{ valueFormatter: (v: number) => v.toFixed(3) }]}
                series={[
                  {
                    data: points.map((p) => p.sell),
                    label: 'Venta (S/ por US$)',
                    showMark: false,
                    // Lineal: una curva suavizada inventaría valores entre días (engañoso en finanzas).
                    curve: 'linear',
                    color: 'var(--mui-palette-primary-main)',
                  },
                ]}
                grid={{ horizontal: true }}
              />
            </Suspense>
          </div>
        )}
      </ClientOnly>
      <figcaption className="sr-only">
        <table>
          <caption>Tipo de cambio venta de los últimos días</caption>
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Venta</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.date}>
                <td>{point.date}</td>
                <td>{point.sell.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
