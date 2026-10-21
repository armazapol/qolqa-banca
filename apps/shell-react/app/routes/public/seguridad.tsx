import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { ProsePage } from '../../components/ProsePage';
import type { Route } from './+types/seguridad';

export const meta: Route.MetaFunction = () => [
  { title: 'Seguridad · Qolqa Banca Digital' },
  {
    name: 'description',
    content:
      'Cómo protegemos tu cuenta y qué puedes hacer para operar con seguridad.',
  },
];

export default function Seguridad() {
  return (
    <ProsePage title="Tu seguridad es lo primero">
      <Alert severity="warning">
        Qolqa <strong>nunca</strong> te pedirá tu contraseña ni tu código de
        verificación por teléfono, correo, SMS o redes sociales.
      </Alert>

      <Typography variant="h2">Cómo protegemos tu cuenta</Typography>
      <ul>
        <li>
          <strong>Autenticación reforzada:</strong> además de tu contraseña,
          cada ingreso y cada transferencia requieren un código de tu app de
          autenticación, que solo puede usarse una vez.
        </li>
        <li>
          <strong>Bloqueo preventivo:</strong> tras 5 intentos fallidos el
          acceso se bloquea 15 minutos.
        </li>
        <li>
          <strong>Cierre por inactividad:</strong> si no usas la banca por 5
          minutos, cerramos tu sesión.
        </li>
        <li>
          <strong>Datos enmascarados:</strong> solo mostramos los últimos
          dígitos de tus cuentas y tarjetas.
        </li>
        <li>
          <strong>Avisos al instante:</strong> te notificamos cada operación en
          tiempo real.
        </li>
      </ul>

      <Typography variant="h2">Recomendaciones</Typography>
      <ul>
        <li>
          Escribe siempre la dirección de Qolqa en tu navegador; no ingreses
          desde enlaces recibidos.
        </li>
        <li>Usa una contraseña única, que no utilices en otros servicios.</li>
        <li>Mantén actualizados tu navegador y tu sistema operativo.</li>
        <li>No operes desde computadoras públicas o redes Wi-Fi abiertas.</li>
      </ul>
    </ProsePage>
  );
}
