import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { useAppDispatch, useAppSelector } from '../store/store';
import { noticeDismissed } from '../store/ui-slice';

/** Muestra los avisos globales de uno en uno. El Alert anuncia el mensaje a lectores de pantalla. */
export function NoticeCenter() {
  const notice = useAppSelector((state) => state.ui.notices[0]);
  const dispatch = useAppDispatch();
  if (!notice) return null;

  const close = () => dispatch(noticeDismissed(notice.id));
  return (
    <Snackbar
      key={notice.id}
      open
      autoHideDuration={6000}
      onClose={(_, reason) => reason !== 'clickaway' && close()}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={close}
        severity={notice.severity}
        variant="filled"
        className="w-full"
      >
        {notice.message}
      </Alert>
    </Snackbar>
  );
}
