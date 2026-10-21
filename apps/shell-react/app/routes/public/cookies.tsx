import Typography from '@mui/material/Typography';
import { ProsePage } from '../../components/ProsePage';
import type { Route } from './+types/cookies';

export const meta: Route.MetaFunction = () => [
  { title: 'Política de cookies · Qolqa Banca Digital' },
  {
    name: 'description',
    content: 'Qué cookies usamos y cómo gestionar tu consentimiento.',
  },
];

export default function Cookies() {
  return (
    <ProsePage title="Política de cookies" updated="21 de octubre de 2026">
      <Typography variant="h2">Cookies estrictamente necesarias</Typography>
      <Typography>
        Son imprescindibles para que la banca funcione de forma segura y no
        requieren consentimiento:
      </Typography>
      <ul>
        <li>
          <strong>Sesión</strong>: mantiene tu sesión iniciada. Es inaccesible
          para JavaScript (httpOnly) y caduca tras 30 minutos sin actividad.
        </li>
        <li>
          <strong>Protección CSRF</strong>: impide que otro sitio realice
          operaciones en tu nombre.
        </li>
      </ul>

      <Typography variant="h2">Preferencias</Typography>
      <Typography>
        Guardamos en tu navegador (localStorage) el tema claro u oscuro que
        elijas. No contiene datos personales.
      </Typography>

      <Typography variant="h2">Cookies analíticas</Typography>
      <Typography>
        Solo se activan si las aceptas. Nos ayudan a medir el rendimiento del
        sitio de forma agregada y sin datos personales ni importes. Puedes
        cambiar tu decisión en cualquier momento.
      </Typography>
    </ProsePage>
  );
}
