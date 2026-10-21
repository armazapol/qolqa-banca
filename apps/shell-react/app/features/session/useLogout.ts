import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { logoutSession } from '../../lib/api/session';
import { type LogoutReason, sessionEnded } from '../../store/session-slice';
import { useAppDispatch } from '../../store/store';

/** Cierra la sesión en el BFF y borra todo dato privado de la memoria del cliente. */
export function useLogout() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useCallback(
    async (reason: LogoutReason) => {
      if (reason !== 'expired') {
        // Si falla la red, igual se limpia el estado local.
        await logoutSession().catch(() => undefined);
      }
      dispatch(sessionEnded(reason));
      queryClient.clear();
      await navigate('/ingresar', { replace: true });
    },
    [dispatch, navigate, queryClient],
  );
}
