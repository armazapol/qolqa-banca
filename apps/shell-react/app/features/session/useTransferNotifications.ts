import {
  formatCents,
  type TransferNotification,
  WS_EVENTS,
} from '@qolqa/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createNotificationsSocket } from '../../lib/realtime/sockets';
import { useAppDispatch } from '../../store/store';
import { noticeShown } from '../../store/ui-slice';

/** Aviso en tiempo real de cada operación (ADR-0011) y refresco de saldos. */
export function useTransferNotifications() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = createNotificationsSocket();
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['movements'] });
    };

    socket.on(WS_EVENTS.transferCompleted, (event: TransferNotification) => {
      dispatch(
        noticeShown(
          `Transferencia de ${formatCents(event.amountCents, event.currency)} a la cuenta ${event.accountNumberMasked} realizada.`,
          'success',
        ),
      );
      refresh();
    });
    socket.on(WS_EVENTS.transferReceived, (event: TransferNotification) => {
      dispatch(
        noticeShown(
          `Recibiste ${formatCents(event.amountCents, event.currency)} en tu cuenta ${event.accountNumberMasked}.`,
          'info',
        ),
      );
      refresh();
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch, queryClient]);
}
