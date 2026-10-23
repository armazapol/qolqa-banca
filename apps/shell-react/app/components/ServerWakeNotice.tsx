import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { useSyncExternalStore } from 'react';
import { isServerWaking, SERVER_WAKING_EVENT } from '../lib/api/server-wake';

function subscribe(onChange: () => void): () => void {
  window.addEventListener(SERVER_WAKING_EVENT, onChange);
  return () => window.removeEventListener(SERVER_WAKING_EVENT, onChange);
}

/** Aviso mientras el BFF arranca tras estar dormido (ADR-0023). Desaparece solo. */
export function ServerWakeNotice() {
  const waking = useSyncExternalStore(subscribe, isServerWaking, () => false);
  return (
    <Snackbar
      open={waking}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert severity="info" variant="filled" role="status" className="w-full">
        Despertando el servidor… Tras un rato sin uso, la primera conexión puede
        tardar hasta un minuto.
      </Alert>
    </Snackbar>
  );
}
