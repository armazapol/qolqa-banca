import { createTheme } from '@mui/material/styles';

/**
 * Paleta "andina" (ADR-0019): azul petróleo como color principal y dorado como acento.
 * Contraste verificado (WCAG AA): primary.main sobre blanco 9,18:1; texto
 * secundario claro 6,72:1; texto principal oscuro sobre el fondo 15,21:1.
 * El dorado (2,19:1 sobre blanco) solo se usa como fondo con texto oscuro
 * (8,34:1), nunca como texto ni como indicador de foco.
 */
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: '#0B4F5C',
          light: '#3C7682',
          dark: '#073A44',
          contrastText: '#FFFFFF',
        },
        secondary: { main: '#E0A526', contrastText: '#1B1405' },
        background: { default: '#F5F7F7', paper: '#FFFFFF' },
        text: { primary: '#12201F', secondary: '#4A5A5C' },
        success: { main: '#1E7A46' },
        error: { main: '#B42318' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#7CC7D3', contrastText: '#062A31' },
        secondary: { main: '#F0BE52', contrastText: '#1B1405' },
        background: { default: '#0E1A1C', paper: '#152427' },
        text: { primary: '#E7EFEF', secondary: '#A9BBBD' },
        success: { main: '#5CC98A' },
        error: { main: '#F97066' },
      },
    },
  },
  typography: {
    fontFamily:
      '"Inter Variable", system-ui, -apple-system, "Segoe UI", sans-serif',
    h1: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.25rem', fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiCard: { defaultProps: { variant: 'outlined' } },
    MuiTextField: { defaultProps: { fullWidth: true } },
    // Foco visible siempre (WCAG 2.4.7) con contraste ≥ 3:1 en ambos modos (1.4.11).
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible': {
            outline: '3px solid var(--mui-palette-primary-main)',
            outlineOffset: 2,
          },
        },
      },
    },
  },
});
