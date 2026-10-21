import { zodResolver } from '@hookform/resolvers/zod';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  CURRENCY_SYMBOL,
  createTransferRequestSchema,
  IDEMPOTENCY_HEADER,
  otpCodeSchema,
  toCents,
  type TransferResponse,
} from '@qolqa/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import { dashboardQuery } from '../../features/accounts/queries';
import { transfersCreate } from '../../generated/rest/transfers/transfers';
import { trackEvent } from '../../lib/analytics';
import { ApiError, errorMessage } from '../../lib/api/errors';
import { formatCents, formatDateTime } from '../../lib/format';

/** Paso 1: los mismos esquemas Zod que valida el BFF (ADR-0018), sin el OTP. */
const detailsSchema = createTransferRequestSchema.omit({ otp: true });
type Details = z.infer<typeof detailsSchema>;
const otpSchema = z.object({ otp: otpCodeSchema });

const STEPS = ['Datos', 'Confirmación', 'Constancia'];

export default function Transferir() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery(dashboardQuery());
  const [details, setDetails] = useState<Details | null>(null);
  const [receipt, setReceipt] = useState<TransferResponse | null>(null);
  // Una clave por intento de confirmación: si la red falla y se reintenta, el BFF no duplica la operación.
  const idempotencyKey = useRef<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const step = receipt ? 2 : details ? 1 : 0;

  // Al cambiar de paso, el foco va al título: los lectores de pantalla anuncian el nuevo contexto.
  useEffect(() => headingRef.current?.focus(), [step]);

  const detailsForm = useForm<Details>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      fromAccountId: '',
      toAccountNumber: '',
      amount: '',
      description: '',
    },
  });
  const otpForm = useForm<{ otp: string }>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  const transfer = useMutation({
    mutationFn: ({ otp }: { otp: string }) =>
      transfersCreate(
        { ...(details as Details), otp },
        { headers: { [IDEMPOTENCY_HEADER]: idempotencyKey.current ?? '' } },
      ),
    onSuccess: (result) => {
      // Sin importe ni cuentas: solo la moneda (ADR-0021).
      trackEvent('transfer_completed', { currency: result.currency });
      setReceipt(result);
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['movements'] });
    },
    onError: () => otpForm.reset({ otp: '' }),
  });

  const accounts = data?.accountsList ?? [];
  const selected = accounts.find(
    (account) => account.id === detailsForm.watch('fromAccountId'),
  );
  const fromAccount = accounts.find(
    (account) => account.id === details?.fromAccountId,
  );
  const dailyLimit =
    selected && data
      ? selected.currency === 'PEN'
        ? data.profile.dailyLimitPenCents
        : data.profile.dailyLimitUsdCents
      : null;

  const goToReview = detailsForm.handleSubmit((values) => {
    if (selected && toCents(values.amount) > selected.balanceCents) {
      detailsForm.setError('amount', {
        message: 'El importe supera tu saldo disponible',
      });
      return;
    }
    idempotencyKey.current = crypto.randomUUID();
    transfer.reset();
    setDetails(values);
  });

  const confirm = otpForm.handleSubmit(({ otp }) => transfer.mutate({ otp }));

  const restart = () => {
    setReceipt(null);
    setDetails(null);
    detailsForm.reset();
    otpForm.reset();
    transfer.reset();
  };

  const { errors } = detailsForm.formState;
  const otpError = otpForm.formState.errors.otp?.message;
  const stepTitles = [
    'Nueva transferencia',
    'Confirma la operación',
    'Transferencia realizada',
  ];

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Typography
        variant="h1"
        ref={headingRef}
        tabIndex={-1}
        className="outline-none"
      >
        {stepTitles[step]}
      </Typography>
      <Stepper
        activeStep={step}
        alternativeLabel
        aria-label="Progreso de la transferencia"
      >
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {step === 0 && (
        <Card>
          <CardContent>
            {isPending ? (
              <Skeleton variant="rounded" height={320} />
            ) : (
              <form
                onSubmit={goToReview}
                noValidate
                className="flex flex-col gap-4"
              >
                <TextField
                  select
                  label="Cuenta de origen"
                  {...detailsForm.register('fromAccountId')}
                  value={detailsForm.watch('fromAccountId')}
                  error={Boolean(errors.fromAccountId)}
                  helperText={
                    errors.fromAccountId?.message ??
                    (selected
                      ? `Saldo disponible: ${formatCents(selected.balanceCents, selected.currency)}`
                      : ' ')
                  }
                >
                  {accounts.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.alias} · {account.numberMasked} ·{' '}
                      {formatCents(account.balanceCents, account.currency)}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Cuenta de destino (14 dígitos)"
                  slotProps={{
                    htmlInput: { inputMode: 'numeric', maxLength: 14 },
                  }}
                  {...detailsForm.register('toAccountNumber')}
                  error={Boolean(errors.toAccountNumber)}
                  helperText={
                    errors.toAccountNumber?.message ??
                    'Solo cuentas Qolqa en la misma moneda.'
                  }
                />
                <TextField
                  label="Importe"
                  slotProps={{
                    htmlInput: { inputMode: 'decimal' },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          {selected ? CURRENCY_SYMBOL[selected.currency] : ''}
                        </InputAdornment>
                      ),
                    },
                  }}
                  {...detailsForm.register('amount')}
                  error={Boolean(errors.amount)}
                  helperText={
                    errors.amount?.message ??
                    (dailyLimit !== null && selected
                      ? `Límite diario: ${formatCents(dailyLimit, selected.currency)}`
                      : ' ')
                  }
                />
                <TextField
                  label="Descripción (opcional)"
                  slotProps={{ htmlInput: { maxLength: 60 } }}
                  {...detailsForm.register('description')}
                  error={Boolean(errors.description)}
                  helperText={errors.description?.message ?? ' '}
                />
                <Button type="submit" variant="contained" size="large">
                  Continuar
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {step === 1 && details && fromAccount && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
              <dt className="opacity-75">Desde</dt>
              <dd className="m-0">
                {fromAccount.alias} · {fromAccount.numberMasked}
              </dd>
              <dt className="opacity-75">Hacia</dt>
              <dd className="m-0 font-mono">{details.toAccountNumber}</dd>
              <dt className="opacity-75">Importe</dt>
              <dd className="m-0 text-xl font-bold">
                {formatCents(toCents(details.amount), fromAccount.currency)}
              </dd>
              {details.description && (
                <>
                  <dt className="opacity-75">Descripción</dt>
                  <dd className="m-0">{details.description}</dd>
                </>
              )}
            </dl>
            {transfer.isError && (
              <Alert severity="error" role="alert">
                {errorMessage(transfer.error)}
                {transfer.error instanceof ApiError &&
                  transfer.error.status === 403 &&
                  ' Espera a que tu app muestre un código nuevo.'}
              </Alert>
            )}
            <form onSubmit={confirm} noValidate className="flex flex-col gap-4">
              <TextField
                label="Código de verificación"
                autoComplete="one-time-code"
                autoFocus
                slotProps={{
                  htmlInput: { inputMode: 'numeric', maxLength: 6 },
                }}
                {...otpForm.register('otp')}
                error={Boolean(otpError)}
                helperText={
                  otpError ??
                  'Ingresa el código de 6 dígitos de tu app de autenticación.'
                }
              />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  onClick={() => setDetails(null)}
                  disabled={transfer.isPending}
                >
                  Modificar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  loading={transfer.isPending}
                >
                  Confirmar transferencia
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 2 && receipt && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <CheckCircleOutline
              color="success"
              sx={{ fontSize: 56 }}
              aria-hidden="true"
            />
            <Typography className="text-3xl! font-bold">
              {formatCents(receipt.amountCents, receipt.currency)}
            </Typography>
            <Typography color="text.secondary">
              enviados a la cuenta {receipt.toAccountNumberMasked} el{' '}
              {formatDateTime(receipt.createdAt)}
            </Typography>
            <Typography variant="body2" className="font-mono">
              N.° de operación: {receipt.id.slice(0, 8).toUpperCase()}
            </Typography>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={restart} variant="outlined">
                Nueva transferencia
              </Button>
              <Button component={Link} to="/app" variant="contained">
                Volver al resumen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
