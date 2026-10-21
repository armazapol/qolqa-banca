import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import type { ComponentType, ReactNode } from 'react';
import { Provider } from 'react-redux';
import { createRoutesStub } from 'react-router';
import { type AppStore, makeStore, type RootState } from '../app/store/store';
import { AppThemeProvider } from '../app/theme/AppThemeProvider';

interface Options {
  path?: string;
  initialEntry?: string;
  preloadedState?: Partial<RootState>;
  extraRoutes?: { path: string; Component: ComponentType }[];
}

/** Renderiza una ruta con los mismos providers que la app (Redux, TanStack Query, MUI, router). */
export function renderRoute(
  Component: ComponentType,
  options: Options = {},
): RenderResult & { store: AppStore; queryClient: QueryClient } {
  const store = makeStore(options.preloadedState);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const path = options.path ?? '/';
  const Stub = createRoutesStub([
    { path, Component },
    ...(options.extraRoutes ?? []),
  ]);
  const Providers = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>{children}</AppThemeProvider>
      </QueryClientProvider>
    </Provider>
  );

  const result = render(
    <Providers>
      <Stub initialEntries={[options.initialEntry ?? path]} />
    </Providers>,
  );
  return { ...result, store, queryClient };
}
