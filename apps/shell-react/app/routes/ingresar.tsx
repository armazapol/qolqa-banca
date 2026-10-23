import { zodResolver } from '@hookform/resolvers/zod';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  type LoginRequest,
  loginRequestSchema,
  otpCodeSchema,
} from '@qolqa/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { ColorModeToggle } from '../components/ColorModeToggle';
import { Logo } from '../components/Logo';
import { useAuthLogin, useAuthVerifyOtp } from '../generated/rest/auth/auth';
import { trackEvent } from '../lib/analytics';
import { errorMessage } from '../lib/api/errors';
import { storeSession } from '../lib/api/session';
import { safeRedirect } from '../lib/safe-redirect';
import { sessionStarted } from '../store/session-slice';
import { useAppDispatch, useAppSelector } from '../store/store';
import type { Route } from './+types/ingresar';

export const meta: Route.MetaFunction = () => [
  { title: 'Ingresar · Qolqa Banca Digital' },
  { name: 'description', content: 'Ingresa a tu banca por internet Qolqa.' },
];

const otpFormSchema = z.object({ code: otpCodeSchema });
type OtpForm = z.infer<typeof otpFormSchema>;

const REASONS = {
  idle: 'Cerramos tu sesión por inactividad. Ingresa nuevamente para continuar.',
  expired: 'Tu sesión expiró. Ingresa nuevamente para continuar.',
  manual: 'Cerraste sesión correctamente.',
} as const;

function PasswordStep({
  onChallenge,
}: {
  onChallenge: (token: string) => void;
}) {
  const login = useAuthLogin();
  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors } = form.formState;
  const [showPassword, setShowPassword] = useState(false);

  const submit = form.handleSubmit(async (data) => {
    const result = await login.mutateAsync({ data }).catch(() => null);
    if (result) onChallenge(result.challengeToken);
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {login.isError && (
        <Alert severity="error" role="alert">
          {errorMessage(login.error)}
        </Alert>
      )}
      <TextField
        label="Correo electrónico"
        type="email"
        autoComplete="username"
        autoFocus
        {...form.register('email')}
        error={Boolean(errors.email)}
        helperText={errors.email?.message}
      />
      <TextField
        label="Contraseña"
        type={showPassword ? 'text' : 'password'}
        autoComplete="current-password"
        {...form.register('password')}
        error={Boolean(errors.password)}
        helperText={errors.password?.message}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={
                    showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                  }
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((shown) => !shown)}
                  // Mantiene el foco en el campo al pulsar el botón.
                  onMouseDown={(event) => event.preventDefault()}
                  edge="end"
                >
                  {showPassword ? (
                    <VisibilityOffOutlined />
                  ) : (
                    <VisibilityOutlined />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      <Button
        type="submit"
        variant="contained"
        size="large"
        loading={login.isPending}
      >
        Continuar
      </Button>
    </form>
  );
}

function OtpStep({
  challengeToken,
  onBack,
}: {
  challengeToken: string;
  onBack: () => void;
}) {
  const verify = useAuthVerifyOtp();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const form = useForm<OtpForm>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: { code: '' },
  });
  const { errors } = form.formState;

  const submit = form.handleSubmit(async ({ code }) => {
    const session = await verify
      .mutateAsync({ data: { challengeToken, code } })
      .catch(() => null);
    if (!session) {
      form.reset({ code: '' });
      return;
    }
    storeSession(session);
    queryClient.clear();
    dispatch(sessionStarted(session.user));
    trackEvent('login', { method: 'totp' });
    await navigate(safeRedirect(params.get('redirigir')), { replace: true });
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Typography color="text.secondary">
        Abre tu app de autenticación e ingresa el código de 6 dígitos de Qolqa.
      </Typography>
      {verify.isError && (
        <Alert severity="error" role="alert">
          {errorMessage(verify.error)}
        </Alert>
      )}
      <TextField
        label="Código de verificación"
        autoComplete="one-time-code"
        autoFocus
        slotProps={{
          htmlInput: { inputMode: 'numeric', maxLength: 6, pattern: '[0-9]*' },
        }}
        {...form.register('code')}
        error={Boolean(errors.code)}
        helperText={errors.code?.message}
      />
      <Button
        type="submit"
        variant="contained"
        size="large"
        loading={verify.isPending}
      >
        Verificar e ingresar
      </Button>
      <Button onClick={onBack}>Volver</Button>
    </form>
  );
}

export default function Ingresar() {
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const reason = useAppSelector((state) => state.session.logoutReason);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Logo />
        <ColorModeToggle />
      </header>
      <main
        id="contenido"
        className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center"
      >
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col gap-4 p-6!">
            <Typography variant="h1" className="text-2xl!">
              {challengeToken
                ? 'Verificación en dos pasos'
                : 'Ingresa a tu cuenta'}
            </Typography>
            {reason && !challengeToken && (
              <Alert severity="info">{REASONS[reason]}</Alert>
            )}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={challengeToken ? 'otp' : 'password'}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
              >
                {challengeToken ? (
                  <OtpStep
                    challengeToken={challengeToken}
                    onBack={() => setChallengeToken(null)}
                  />
                ) : (
                  <PasswordStep onChallenge={setChallengeToken} />
                )}
              </motion.div>
            </AnimatePresence>
            <Typography variant="body2" color="text.secondary">
              ¿Problemas para ingresar? Revisa nuestras{' '}
              <Link to="/seguridad" className="underline">
                recomendaciones de seguridad
              </Link>
              .
            </Typography>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
