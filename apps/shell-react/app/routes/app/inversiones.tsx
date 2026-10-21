import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

/** Punto de montaje del microfrontend Angular <bank-investments> (Fase 3, ADR-0003). */
export default function Inversiones() {
  return (
    <div className="flex flex-col gap-4">
      <Typography variant="h1">Inversiones</Typography>
      <Alert severity="info">
        El módulo de inversiones (microfrontend en Angular) se integrará en la
        siguiente fase.
      </Alert>
    </div>
  );
}
