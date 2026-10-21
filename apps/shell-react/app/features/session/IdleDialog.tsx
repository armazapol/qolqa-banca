import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

interface IdleDialogProps {
  open: boolean;
  secondsLeft: number;
  onStay: () => void;
  onLogout: () => void;
}

/** Aviso de cierre por inactividad (role alertdialog: interrumpe y se anuncia). */
export function IdleDialog({
  open,
  secondsLeft,
  onStay,
  onLogout,
}: IdleDialogProps) {
  return (
    <Dialog
      open={open}
      role="alertdialog"
      aria-labelledby="idle-title"
      aria-describedby="idle-description"
      // Cerrar con Escape o clic fuera también cuenta como "seguir conectado".
      onClose={onStay}
    >
      <DialogTitle id="idle-title">¿Sigues ahí?</DialogTitle>
      <DialogContent>
        <DialogContentText id="idle-description">
          Por tu seguridad, cerraremos tu sesión en{' '}
          <strong aria-live="polite" aria-atomic="true">
            {secondsLeft} segundos
          </strong>{' '}
          por inactividad.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onLogout}>Cerrar sesión</Button>
        <Button onClick={onStay} variant="contained" autoFocus>
          Seguir conectado
        </Button>
      </DialogActions>
    </Dialog>
  );
}
