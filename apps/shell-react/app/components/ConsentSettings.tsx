import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { denyAnalytics, isAnalyticsConfigured } from '../lib/analytics';
import { clearConsent } from '../lib/consent';
import { consentReset } from '../store/consent-slice';
import { useAppDispatch, useAppSelector } from '../store/store';

const LABEL = {
  granted: 'Aceptaste las cookies analíticas.',
  denied: 'Rechazaste las cookies analíticas.',
  pending: 'Aún no has decidido sobre las cookies analíticas.',
  unknown: '',
} as const;

/** Revocar o cambiar el consentimiento debe ser tan fácil como darlo (Ley 29733). */
export function ConsentSettings() {
  const dispatch = useAppDispatch();
  const consent = useAppSelector((state) => state.consent.analytics);
  if (!isAnalyticsConfigured() || consent === 'unknown') return null;

  const reset = () => {
    // Mientras decide de nuevo, se deja de medir.
    denyAnalytics();
    clearConsent();
    dispatch(consentReset());
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Typography role="status">{LABEL[consent]}</Typography>
      {consent !== 'pending' && (
        <Button variant="outlined" onClick={reset}>
          Cambiar mi decisión
        </Button>
      )}
    </div>
  );
}
