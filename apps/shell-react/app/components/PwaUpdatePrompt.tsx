import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import { useEffect, useState } from 'react';

type UpdateFn = (reloadPage?: boolean) => Promise<void>;

/**
 * Registro del service worker y aviso de nueva versión (ADR-0021).
 * Nunca se recarga solo: una actualización a mitad de una transferencia
 * podría perder lo que el usuario estaba escribiendo.
 */
export function PwaUpdatePrompt() {
  const [update, setUpdate] = useState<UpdateFn | null>(null);
  const [needRefresh, setNeedRefresh] = useState(false);

  useEffect(() => {
    // En desarrollo no hay service worker (Vite sirve los módulos sin empaquetar).
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    void import('virtual:pwa-register').then(({ registerSW }) => {
      const updateSW = registerSW({
        onNeedRefresh: () => setNeedRefresh(true),
      });
      setUpdate(() => updateSW);
    });
  }, []);

  return (
    <Snackbar
      open={needRefresh}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    >
      <Alert
        severity="info"
        variant="filled"
        action={
          <>
            <Button
              color="inherit"
              size="small"
              onClick={() => setNeedRefresh(false)}
            >
              Más tarde
            </Button>
            <Button
              color="inherit"
              size="small"
              onClick={() => void update?.(true)}
            >
              Actualizar
            </Button>
          </>
        }
      >
        Hay una nueva versión de Qolqa disponible.
      </Alert>
    </Snackbar>
  );
}
