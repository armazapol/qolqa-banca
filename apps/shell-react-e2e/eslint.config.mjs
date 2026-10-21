import playwright from 'eslint-plugin-playwright';
import baseConfig from '../../eslint.config.mjs';

export default [
  playwright.configs['flat/recommended'],
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.js'],
    rules: {
      // test.skip(condición, motivo) documenta en qué navegadores aplica un caso; un skip incondicional sigue avisando.
      'playwright/no-skipped-test': ['warn', { allowConditional: true }],
    },
  },
  {
    // Excepciones aquí y no en comentarios: lint-staged usa la configuración raíz, sin el plugin de Playwright.
    files: ['src/fixtures.ts'],
    rules: {
      // Las aserciones de los fixtures corren dentro de cada test.
      'playwright/no-standalone-expect': 'off',
      // Motion no expone un evento de fin de animación: expectAccessible espera su duración máxima.
      'playwright/no-wait-for-timeout': 'off',
    },
  },
];
