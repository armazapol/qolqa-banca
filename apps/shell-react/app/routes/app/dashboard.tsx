import ChevronRight from '@mui/icons-material/ChevronRight';
import CreditCardOutlined from '@mui/icons-material/CreditCardOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { dashboardQuery } from '../../features/accounts/queries';
import { RevealAccountNumber } from '../../features/accounts/RevealAccountNumber';
import { FxLiveQuote } from '../../features/fx/FxLiveQuote';
import { errorMessage } from '../../lib/api/errors';
import { formatCents } from '../../lib/format';

const ACCOUNT_TYPE = {
  CHECKING: 'Cuenta corriente',
  SAVINGS: 'Cuenta de ahorros',
} as const;

export default function Dashboard() {
  const { data, isPending, isError, error, refetch } =
    useQuery(dashboardQuery());

  if (isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={() => void refetch()}>
            Reintentar
          </Button>
        }
      >
        {errorMessage(error)}
      </Alert>
    );
  }

  const firstName = data?.profile.fullName.split(' ')[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Typography variant="h1">
            {firstName ? `Hola, ${firstName}` : <Skeleton width={200} />}
          </Typography>
          <Typography color="text.secondary">
            Este es el resumen de tus productos.
          </Typography>
        </div>
        <Button component={Link} to="/app/transferir" variant="contained">
          Nueva transferencia
        </Button>
      </div>

      <section aria-labelledby="cuentas-titulo" className="flex flex-col gap-3">
        <Typography id="cuentas-titulo" variant="h2">
          Mis cuentas
        </Typography>
        <ul
          className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy={isPending}
        >
          {isPending
            ? Array.from({ length: 3 }, (_, i) => (
                <li key={i}>
                  <Skeleton variant="rounded" height={150} />
                </li>
              ))
            : data.accountsList.map((account) => (
                <li key={account.id}>
                  <Card className="h-full">
                    <CardContent className="flex flex-col gap-1">
                      <Typography variant="body2" color="text.secondary">
                        {ACCOUNT_TYPE[account.type]} ·{' '}
                        {account.currency === 'PEN' ? 'Soles' : 'Dólares'}
                      </Typography>
                      <Typography variant="h3" component="h3">
                        {account.alias}
                      </Typography>
                      <RevealAccountNumber
                        accountId={account.id}
                        masked={account.numberMasked}
                      />
                      <Typography className="mt-2! text-2xl! font-bold tabular-nums">
                        {formatCents(account.balanceCents, account.currency)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Saldo disponible
                      </Typography>
                    </CardContent>
                    <CardActionArea
                      component={Link}
                      to={`/app/movimientos/${account.id}`}
                      className="flex justify-between border-t border-black/10 px-4 py-2 dark:border-white/10"
                    >
                      <span className="text-sm font-medium">
                        Ver movimientos
                        <span className="sr-only"> de {account.alias}</span>
                      </span>
                      <ChevronRight fontSize="small" aria-hidden="true" />
                    </CardActionArea>
                  </Card>
                </li>
              ))}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <FxLiveQuote />
        <Card component="section" aria-labelledby="tarjetas-titulo">
          <CardContent className="flex flex-col gap-3">
            <Typography id="tarjetas-titulo" variant="h3" component="h2">
              Mis tarjetas
            </Typography>
            {isPending ? (
              <Skeleton variant="rounded" height={80} />
            ) : (
              data.cards.map((card) => (
                <div key={card.id} className="flex items-center gap-3">
                  <CreditCardOutlined color="primary" aria-hidden="true" />
                  <div>
                    <Typography className="font-mono tabular-nums">
                      {card.maskedPan}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.brand === 'VISA' ? 'Visa' : 'Mastercard'} débito ·
                      vence {card.expiry} ·{' '}
                      {card.status === 'ACTIVE' ? 'Activa' : 'Bloqueada'}
                    </Typography>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
