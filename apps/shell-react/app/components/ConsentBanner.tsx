import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import {
  denyAnalytics,
  grantAnalytics,
  isAnalyticsConfigured,
} from '../lib/analytics';
import {
  type AnalyticsConsent,
  readConsent,
  writeConsent,
} from '../lib/consent';
import { consentDecided, consentLoaded } from '../store/consent-slice';
import { useAppDispatch, useAppSelector } from '../store/store';

/**
 * Banner de consentimiento (Ley 29733). No bloquea la navegación y ofrece
 * "Rechazar" con el mismo peso visual que "Aceptar". Si GA4 no está
 * configurado no hay nada que consentir y no se muestra.
 */
export function ConsentBanner() {
  const dispatch = useAppDispatch();
  const consent = useAppSelector((state) => state.consent.analytics);

  useEffect(() => {
    dispatch(consentLoaded(readConsent()));
  }, [dispatch]);

  // La preferencia (guardada o recién elegida) se aplica a GA4.
  useEffect(() => {
    if (consent === 'granted') grantAnalytics();
    if (consent === 'denied') denyAnalytics();
  }, [consent]);

  const decide = (choice: AnalyticsConsent) => {
    writeConsent(choice);
    dispatch(consentDecided(choice));
  };

  const visible = consent === 'pending' && isAnalyticsConfigured();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          className="fixed inset-x-0 bottom-0 z-50 p-4 md:bottom-4 md:left-auto md:max-w-md"
        >
          <Paper
            component="section"
            aria-labelledby="consent-title"
            elevation={8}
            className="flex flex-col gap-3 p-4"
          >
            <Typography
              id="consent-title"
              variant="h3"
              component="h2"
              className="text-base!"
            >
              Tu privacidad
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Usamos cookies analíticas para medir el rendimiento del sitio, de
              forma agregada y sin datos personales ni importes. Solo se activan
              si las aceptas.{' '}
              <Link to="/legal/cookies" className="underline">
                Más información
              </Link>
            </Typography>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outlined" onClick={() => decide('denied')}>
                Rechazar
              </Button>
              <Button variant="contained" onClick={() => decide('granted')}>
                Aceptar
              </Button>
            </div>
          </Paper>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
