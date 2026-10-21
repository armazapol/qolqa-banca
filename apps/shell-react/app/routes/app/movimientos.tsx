import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  dashboardQuery,
  movementsQuery,
} from '../../features/accounts/queries';
import { errorMessage } from '../../lib/api/errors';
import { formatCents, formatDateTime } from '../../lib/format';
import type { Route } from './+types/movimientos';

export default function Movimientos({ params }: Route.ComponentProps) {
  const navigate = useNavigate();
  const accounts = useQuery(dashboardQuery());
  const movements = useInfiniteQuery(movementsQuery(params.accountId));
  const account = accounts.data?.accountsList.find(
    (item) => item.id === params.accountId,
  );
  const items = movements.data?.pages.flatMap((page) => page.items) ?? [];

  const amount = (type: string, cents: number) => {
    if (!account) return '';
    const signed = type === 'DEBIT' ? -cents : cents;
    return formatCents(signed, account.currency);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Typography variant="h1">Movimientos</Typography>
        {accounts.data && (
          <TextField
            select
            label="Cuenta"
            value={params.accountId}
            onChange={(event) =>
              void navigate(`/app/movimientos/${event.target.value}`)
            }
            className="w-full sm:w-80!"
          >
            {accounts.data.accountsList.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.alias} · {item.numberMasked}
              </MenuItem>
            ))}
          </TextField>
        )}
      </div>

      {movements.isError && (
        <Alert severity="error">{errorMessage(movements.error)}</Alert>
      )}

      <Card>
        {movements.isPending ? (
          <div className="flex flex-col gap-2 p-4" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} height={40} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Typography className="p-6">
            Esta cuenta aún no tiene movimientos.
          </Typography>
        ) : (
          <>
            {/* Escritorio: tabla semántica con encabezados. */}
            <Table
              className="hidden sm:table"
              aria-label={`Movimientos de ${account?.alias ?? 'la cuenta'}`}
            >
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell align="right">Importe</TableCell>
                  <TableCell align="right">Saldo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(item.createdAt)}
                    </TableCell>
                    <TableCell>
                      {item.description}
                      {item.counterparty && (
                        <Typography variant="body2" color="text.secondary">
                          {item.counterparty}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell
                      align="right"
                      className={`tabular-nums ${item.type === 'CREDIT' ? 'text-[var(--mui-palette-success-main)]' : ''}`}
                    >
                      {amount(item.type, item.amountCents)}
                    </TableCell>
                    <TableCell align="right" className="tabular-nums">
                      {account &&
                        formatCents(item.balanceAfterCents, account.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Móvil: lista compacta. */}
            <ul className="m-0 list-none divide-y divide-black/10 p-0 sm:hidden dark:divide-white/10">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="m-0 truncate font-medium">
                      {item.description}
                    </p>
                    <p className="m-0 text-sm opacity-75">
                      {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                  <p
                    className={`m-0 font-semibold tabular-nums ${item.type === 'CREDIT' ? 'text-[var(--mui-palette-success-main)]' : ''}`}
                  >
                    {amount(item.type, item.amountCents)}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {movements.hasNextPage && (
        <Button
          onClick={() => void movements.fetchNextPage()}
          loading={movements.isFetchingNextPage}
          variant="outlined"
          className="self-center"
        >
          Cargar más movimientos
        </Button>
      )}
    </div>
  );
}
