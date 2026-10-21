import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import PersonOutline from '@mui/icons-material/PersonOutlined';
import SendOutlined from '@mui/icons-material/SendOutlined';
import ShowChartOutlined from '@mui/icons-material/ShowChartOutlined';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { Link, NavLink, Outlet, redirect, useLocation } from 'react-router';
import { ColorModeToggle } from '../../components/ColorModeToggle';
import { Logo } from '../../components/Logo';
import { SkipLink } from '../../components/SkipLink';
import { IdleDialog } from '../../features/session/IdleDialog';
import { useIdleTimeout } from '../../features/session/useIdleTimeout';
import { useLogout } from '../../features/session/useLogout';
import { useTransferNotifications } from '../../features/session/useTransferNotifications';
import { refreshSession, SESSION_EXPIRED_EVENT } from '../../lib/api/session';
import { tokenStore } from '../../lib/api/token-store';
import { sessionStarted } from '../../store/session-slice';
import { getStore, useAppSelector } from '../../store/store';
import type { Route } from './+types/layout';

const IDLE_WARN_MS = 4 * 60_000;
const IDLE_TIMEOUT_MS = 5 * 60_000;

const NAV = [
  {
    to: '/app',
    label: 'Resumen',
    icon: AccountBalanceWalletOutlined,
    end: true,
  },
  {
    to: '/app/transferir',
    label: 'Transferir',
    icon: SendOutlined,
    end: false,
  },
  {
    to: '/app/inversiones',
    label: 'Inversiones',
    icon: ShowChartOutlined,
    end: false,
  },
  { to: '/app/perfil', label: 'Perfil', icon: PersonOutline, end: false },
];

export const meta: Route.MetaFunction = () => [
  { title: 'Mi banca · Qolqa' },
  // Área privada: nunca se indexa.
  { name: 'robots', content: 'noindex, nofollow' },
];

/**
 * Solo cliente (ADR-0004): el servidor nunca renderiza datos privados.
 * Si no hay access token en memoria, se intenta recuperar la sesión con la
 * cookie httpOnly; si no existe, se redirige al ingreso.
 */
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const store = getStore();
  if (
    tokenStore.isFresh() &&
    store.getState().session.status === 'authenticated'
  )
    return null;

  const session = await refreshSession();
  if (!session) {
    const { pathname, search } = new URL(request.url);
    throw redirect(
      `/ingresar?redirigir=${encodeURIComponent(pathname + search)}`,
    );
  }
  store.dispatch(sessionStarted(session.user));
  return null;
}

export function HydrateFallback() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center"
      role="status"
      aria-label="Cargando tu banca"
    >
      <CircularProgress />
    </div>
  );
}

export default function AppLayout() {
  const user = useAppSelector((state) => state.session.user);
  const location = useLocation();
  const logout = useLogout();
  const idle = useIdleTimeout({
    warnAfterMs: IDLE_WARN_MS,
    timeoutMs: IDLE_TIMEOUT_MS,
    onTimeout: () => void logout('idle'),
  });
  useTransferNotifications();

  useEffect(() => {
    const onExpired = () => void logout('expired');
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [logout]);

  const activeNav =
    [...NAV]
      .reverse()
      .find((item) =>
        item.end
          ? location.pathname === item.to
          : location.pathname.startsWith(item.to),
      )?.to ?? '/app';

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <header className="sticky top-0 z-10 border-b border-black/10 bg-[var(--mui-palette-background-paper)] dark:border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2">
          <Logo to="/app" />
          <div className="flex items-center gap-1">
            <span className="mr-2 hidden text-sm sm:inline">
              {user?.fullName}
            </span>
            <ColorModeToggle />
            <Tooltip title="Cerrar sesión">
              <IconButton
                aria-label="Cerrar sesión"
                onClick={() => void logout('manual')}
              >
                <LogoutOutlined />
              </IconButton>
            </Tooltip>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 pt-6 pb-24 md:pb-10">
        {/* Navegación lateral en escritorio; en móvil se usa la barra inferior. */}
        <nav aria-label="Banca" className="hidden w-52 shrink-0 md:block">
          <ul className="sticky top-24 m-0 flex list-none flex-col gap-1 p-0">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2 font-medium no-underline ${
                      isActive
                        ? 'bg-brand text-white dark:bg-brand-light dark:text-[#062A31]'
                        : 'hover:bg-black/5 dark:hover:bg-white/10'
                    }`
                  }
                >
                  <Icon fontSize="small" aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={location.pathname}
            id="contenido"
            tabIndex={-1}
            className="min-w-0 flex-1 outline-none"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>

      <Paper
        elevation={8}
        className="fixed inset-x-0 bottom-0 md:hidden"
        component="nav"
        aria-label="Banca"
      >
        <BottomNavigation showLabels value={activeNav}>
          {NAV.map(({ to, label, icon: Icon }) => (
            <BottomNavigationAction
              key={to}
              component={Link}
              to={to}
              value={to}
              label={label}
              icon={<Icon />}
            />
          ))}
        </BottomNavigation>
      </Paper>

      <IdleDialog
        open={idle.warning}
        secondsLeft={idle.secondsLeft}
        onStay={idle.stayActive}
        onLogout={() => void logout('manual')}
      />
    </div>
  );
}
