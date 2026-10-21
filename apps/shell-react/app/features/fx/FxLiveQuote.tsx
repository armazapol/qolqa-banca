import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import type { BankFxQuote } from '@qolqa/contracts';
import { AnimatePresence, motion } from 'motion/react';
import { useFxQuote } from './useFxQuote';

const rate = new Intl.NumberFormat('es-PE', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

function Value({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      {value === undefined ? (
        <Skeleton width={90} height={44} />
      ) : (
        <AnimatePresence mode="popLayout" initial={false}>
          {/* Transición breve al cambiar el valor; desactivada con movimiento reducido. */}
          <motion.p
            key={value}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.25 }}
            className="m-0 text-3xl font-semibold tabular-nums"
          >
            {rate.format(value)}
          </motion.p>
        </AnimatePresence>
      )}
    </div>
  );
}

/** Cotización referencial del banco en vivo. Siempre etiquetada como simulada. */
export function FxLiveQuote({ initial }: { initial?: BankFxQuote | null }) {
  const { quote, status } = useFxQuote(initial);

  return (
    <Card component="section" aria-labelledby="fx-live-title">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Typography id="fx-live-title" variant="h3" component="h2">
            Dólar Qolqa
          </Typography>
          <Chip
            size="small"
            color={status === 'live' ? 'success' : 'default'}
            label={
              status === 'live'
                ? 'En vivo'
                : status === 'connecting'
                  ? 'Conectando…'
                  : 'Sin conexión'
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Value label="Compramos a" value={quote?.buy} />
          <Value label="Vendemos a" value={quote?.sell} />
        </div>
        <Typography variant="caption" color="text.secondary">
          Cotización referencial simulada a partir del tipo de cambio oficial
          del BCRP
          {quote ? ` (${quote.official.date})` : ''}. S/ por US$.
        </Typography>
      </CardContent>
    </Card>
  );
}
