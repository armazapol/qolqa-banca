import Typography from '@mui/material/Typography';
import { ProsePage } from '../../components/ProsePage';
import type { Route } from './+types/privacidad';

export const meta: Route.MetaFunction = () => [
  { title: 'Política de privacidad · Qolqa Banca Digital' },
  {
    name: 'description',
    content: 'Cómo tratamos tus datos personales conforme a la Ley N.° 29733.',
  },
];

export default function Privacidad() {
  return (
    <ProsePage title="Política de privacidad" updated="21 de octubre de 2026">
      <Typography>
        Texto demostrativo. Qolqa es un banco ficticio y este sitio no recopila
        datos personales reales.
      </Typography>

      <Typography variant="h2">Marco legal</Typography>
      <Typography>
        El tratamiento de datos personales se rige por la Ley N.° 29733, Ley de
        Protección de Datos Personales, y su reglamento.
      </Typography>

      <Typography variant="h2">Qué datos tratamos y para qué</Typography>
      <ul>
        <li>
          <strong>Identificación y contacto</strong> (nombre, DNI, correo): para
          identificarte y operar tus productos.
        </li>
        <li>
          <strong>Datos de operaciones</strong>: para ejecutar tus
          transferencias y mostrarte tus movimientos.
        </li>
        <li>
          <strong>Datos técnicos de seguridad</strong> (IP, navegador, fecha de
          acceso): para prevenir fraudes y mantener un registro de auditoría.
        </li>
        <li>
          <strong>Datos de navegación</strong>: solo si aceptas las cookies
          analíticas, de forma agregada y sin datos personales.
        </li>
      </ul>

      <Typography variant="h2">Tus derechos (ARCO)</Typography>
      <Typography>
        Puedes ejercer tus derechos de acceso, rectificación, cancelación y
        oposición escribiendo a privacidad@demo.qolqa.pe.
      </Typography>
    </ProsePage>
  );
}
