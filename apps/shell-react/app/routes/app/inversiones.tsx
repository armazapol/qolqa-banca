import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import {
  INVESTMENTS_EVENTS,
  type InvestmentsEventDetail,
} from '@qolqa/contracts';
import * as Sentry from '@sentry/react-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { loadInvestmentsElement } from '../../features/investments/load-investments';
import { trackEvent } from '../../lib/analytics';
import { notifySessionExpired, refreshSession } from '../../lib/api/session';
import { tokenStore } from '../../lib/api/token-store';
import { safeRedirect } from '../../lib/safe-redirect';
import { useAppDispatch } from '../../store/store';
import { noticeShown } from '../../store/ui-slice';

/**
 * Función que recibe el microfrontend: entrega un token vigente sin exponerlo
 * en atributos ni en almacenamiento (ADR-0010). Si caducó, lo renueva antes.
 */
async function getAccessToken(): Promise<string | null> {
  if (!tokenStore.isFresh()) await refreshSession();
  return tokenStore.get();
}

type EventOf<K extends keyof InvestmentsEventDetail> = CustomEvent<
  InvestmentsEventDetail[K]
>;

/** Punto de montaje del microfrontend Angular <bank-investments> (ADR-0003, ADR-0020). */
export default function Inversiones() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const remote = useQuery({
    queryKey: ['mf-investments'],
    queryFn: () => loadInvestmentsElement().then(() => true),
    staleTime: Infinity,
    retry: 1,
  });

  /*
   * Remote → shell (ADR-0010). Se escucha en window: llegan los eventos del
   * elemento (bubbles + composed) y los errores no controlados que el
   * ErrorHandler de Angular emite globalmente.
   */
  useEffect(() => {
    const onNavigate = (event: Event) => {
      // El destino viene de otro bundle: se valida como cualquier redirección.
      void navigate(
        safeRedirect(
          (event as EventOf<typeof INVESTMENTS_EVENTS.navigate>).detail.to,
        ),
      );
    };
    const onError = (event: Event) => {
      const { kind, message, stack } = (
        event as EventOf<typeof INVESTMENTS_EVENTS.error>
      ).detail;
      if (kind === 'auth') return notifySessionExpired();
      if (kind === 'unknown') {
        // Una sola instancia de Sentry en la página: la del shell.
        const error = new Error(message);
        if (stack) error.stack = stack;
        Sentry.captureException(error, {
          tags: { microfrontend: 'mf-investments' },
        });
      }
      dispatch(noticeShown(message, 'error'));
    };
    const onAnalytics = (event: Event) => {
      const { name, params } = (
        event as EventOf<typeof INVESTMENTS_EVENTS.analytics>
      ).detail;
      trackEvent(name, { ...params, microfrontend: 'mf-investments' });
    };

    window.addEventListener(INVESTMENTS_EVENTS.navigate, onNavigate);
    window.addEventListener(INVESTMENTS_EVENTS.error, onError);
    window.addEventListener(INVESTMENTS_EVENTS.analytics, onAnalytics);
    return () => {
      window.removeEventListener(INVESTMENTS_EVENTS.navigate, onNavigate);
      window.removeEventListener(INVESTMENTS_EVENTS.error, onError);
      window.removeEventListener(INVESTMENTS_EVENTS.analytics, onAnalytics);
    };
  }, [navigate, dispatch]);

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="h1">Inversiones</Typography>

      {remote.isPending && (
        <Skeleton
          variant="rounded"
          height={420}
          aria-label="Cargando inversiones"
        />
      )}

      {remote.isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={() => void remote.refetch()}>
              Reintentar
            </Button>
          }
        >
          El módulo de inversiones no está disponible en este momento. El resto
          de tu banca funciona con normalidad.
        </Alert>
      )}

      {remote.isSuccess && (
        <Card>
          <CardContent>
            {/* React 19 asigna estas props como propiedades JS del custom element, no como atributos. */}
            <bank-investments
              getAccessToken={getAccessToken}
              apiBaseUrl="/api"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
