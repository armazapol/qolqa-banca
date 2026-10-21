import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  // flat/react incluye eslint-plugin-jsx-a11y: reglas de accesibilidad en el JSX (ADR-0008).
  ...nx.configs['flat/react'],
  ...baseConfig,
  {
    ignores: ['app/generated/**', 'build/**', '.react-router/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      // Prevención de XSS: React escapa todo el texto; se prohíbe inyectar HTML sin escapar.
      'react/no-danger': 'error',
    },
  },
  {
    // Los tests de seguridad usan literales de ataque a propósito (p. ej. "javascript:").
    files: ['tests/**/*.{ts,tsx}'],
    rules: { 'no-script-url': 'off' },
  },
];
