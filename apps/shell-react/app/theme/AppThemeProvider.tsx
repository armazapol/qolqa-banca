import CssBaseline from '@mui/material/CssBaseline';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { theme } from './theme';

/**
 * enableCssLayer coloca los estilos de MUI en @layer mui, por debajo de las
 * utilidades de Tailwind (ver styles/app.css).
 */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <StyledEngineProvider enableCssLayer>
      <ThemeProvider theme={theme} defaultMode="system">
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
