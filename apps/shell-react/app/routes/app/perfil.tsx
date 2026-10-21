import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { profileQuery } from '../../features/accounts/queries';
import { errorMessage } from '../../lib/api/errors';
import { formatCents } from '../../lib/format';

export default function Perfil() {
  const { data, isPending, isError, error } = useQuery(profileQuery());

  if (isError) return <Alert severity="error">{errorMessage(error)}</Alert>;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Typography variant="h1">Mi perfil</Typography>

      <Card component="section" aria-labelledby="datos-titulo">
        <CardContent className="flex flex-col gap-3">
          <Typography id="datos-titulo" variant="h3" component="h2">
            Datos personales
          </Typography>
          {isPending ? (
            <Skeleton variant="rounded" height={90} />
          ) : (
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
              <dt className="opacity-75">Nombre</dt>
              <dd className="m-0">{data.profile.fullName}</dd>
              <dt className="opacity-75">Correo</dt>
              <dd className="m-0 break-all">{data.profile.email}</dd>
              <dt className="opacity-75">DNI</dt>
              <dd className="m-0 font-mono">{data.profile.documentMasked}</dd>
            </dl>
          )}
        </CardContent>
      </Card>

      <Card component="section" aria-labelledby="limites-titulo">
        <CardContent className="flex flex-col gap-3">
          <Typography id="limites-titulo" variant="h3" component="h2">
            Límites diarios de transferencia
          </Typography>
          {isPending ? (
            <Skeleton variant="rounded" height={60} />
          ) : (
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
              <dt className="opacity-75">Soles</dt>
              <dd className="m-0 tabular-nums">
                {formatCents(data.profile.dailyLimitPenCents, 'PEN')}
              </dd>
              <dt className="opacity-75">Dólares</dt>
              <dd className="m-0 tabular-nums">
                {formatCents(data.profile.dailyLimitUsdCents, 'USD')}
              </dd>
            </dl>
          )}
        </CardContent>
      </Card>

      <Card component="section" aria-labelledby="seguridad-titulo">
        <CardContent className="flex items-start gap-3">
          <VerifiedUserOutlined color="success" aria-hidden="true" />
          <div>
            <Typography id="seguridad-titulo" variant="h3" component="h2">
              Autenticación reforzada activa
            </Typography>
            <Typography color="text.secondary">
              Tus ingresos y transferencias se confirman con un código de tu app
              de autenticación. Tu sesión se cierra tras 5 minutos de
              inactividad.
            </Typography>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
