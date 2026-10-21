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
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { loadInvestmentsElement } from '../../features/investments/load-investments';
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
  const element = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const remote = useQuery({
    queryKey: ['mf-investments'],
    queryFn: () => loadInvestmentsElement().then(() => true),
    staleTime: Infinity,
    retry: 1,
  });

  // Remote → shell: eventos del DOM (CustomEvent con composed: true).
  useEffect(() => {
    const node = element.current;
    if (!node) return;

    const onNavigate = (event: Event) => {
      // El destino viene de otro bundle: se valida como cualquier redirección.
      void navigate(
        safeRedirect(
          (event as EventOf<typeof INVESTMENTS_EVENTS.navigate>).detail.to,
        ),
      );
    };
    const onError = (event: Event) => {
      const { kind, message } = (
        event as EventOf<typeof INVESTMENTS_EVENTS.error>
      ).detail;
      if (kind === 'auth') notifySessionExpired();
      else dispatch(noticeShown(message, 'error'));
    };

    node.addEventListener(INVESTMENTS_EVENTS.navigate, onNavigate);
    node.addEventListener(INVESTMENTS_EVENTS.error, onError);
    return () => {
      node.removeEventListener(INVESTMENTS_EVENTS.navigate, onNavigate);
      node.removeEventListener(INVESTMENTS_EVENTS.error, onError);
    };
  }, [remote.isSuccess, navigate, dispatch]);

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
              ref={element}
              getAccessToken={getAccessToken}
              apiBaseUrl="/api"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
