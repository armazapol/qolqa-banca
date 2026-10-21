import fontUrl from '@fontsource-variable/inter/index.css?url';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { type ReactNode, useState } from 'react';
import { Provider } from 'react-redux';
import {
  isRouteErrorResponse,
  Links,
  type LinksFunction,
  Meta,
  type MetaFunction,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';
import { NoticeCenter } from './components/NoticeCenter';
import { StatusPage } from './components/StatusPage';
import { makeQueryClient } from './lib/query-client';
import { getStore } from './store/store';
import stylesUrl from './styles/app.css?url';
import { AppThemeProvider } from './theme/AppThemeProvider';
import type { Route } from './+types/root';

export const meta: MetaFunction = () => [
  { title: 'Qolqa Banca Digital' },
  {
    name: 'description',
    content:
      'Banca por internet de Qolqa: cuentas, transferencias seguras y tipo de cambio en tiempo real.',
  },
];

// Fuente auto-alojada (sin Google Fonts): menos terceros y CSP más estricta.
export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: fontUrl },
  { rel: 'stylesheet', href: stylesUrl },
  { rel: 'icon', href: '/favicon.ico' },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    // La clase light/dark la pone InitColorSchemeScript antes de hidratar (sin parpadeo).
    <html lang="es-PE" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0B4F5C" />
        <Meta />
        <Links />
      </head>
      <body>
        <InitColorSchemeScript attribute="class" defaultMode="system" />
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  // Un QueryClient y un store por árbol: en SSR no se comparten entre peticiones.
  const [queryClient] = useState(makeQueryClient);
  const [store] = useState(getStore);

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
          <MotionConfig reducedMotion="user">
            <Outlet />
            <NoticeCenter />
          </MotionConfig>
        </AppThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <AppThemeProvider>
      <StatusPage
        code={notFound ? '404' : 'Error'}
        title={notFound ? 'Página no encontrada' : 'Algo salió mal'}
        description={
          notFound
            ? 'La dirección que buscas no existe o fue movida.'
            : 'Tuvimos un problema inesperado. Tu dinero y tus datos están seguros; inténtalo nuevamente.'
        }
      />
    </AppThemeProvider>
  );
}
