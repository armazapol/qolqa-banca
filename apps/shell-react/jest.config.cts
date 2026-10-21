module.exports = {
  displayName: 'shell-react',
  preset: '../../jest.preset.js',
  // jsdom con fetch/Request/Response reales de Node: necesario para MSW.
  testEnvironment: 'jest-fixed-jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['<rootDir>/tests/**/*.spec.{ts,tsx}'],
  transform: {
    '^(?!.*\\.(js|mjs|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.(mjs|[tj]sx?)$': [
      'babel-jest',
      {
        presets: ['@nx/react/babel'],
        // import.meta.env (Vite) → process.env: Jest no admite import.meta en CommonJS.
        plugins: ['babel-plugin-transform-vite-meta-env'],
      },
    ],
  },
  moduleNameMapper: {
    '^@qolqa/contracts$': '<rootDir>/../../packages/contracts/src/index.ts',
    // Orval y los contratos usan imports ESM con extensión .js.
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '\\.css(\\?url)?$': '<rootDir>/tests/style-mock.ts',
  },
  // Dependencias solo-ESM de MSW: todos los .mjs y until-async ("type": "module" con .js)
  // se transforman a CommonJS; el resto de node_modules se deja tal cual (tests rápidos).
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm/)?until-async[@+/]).+\\.(js|cjs)$',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs'],
  coverageDirectory: 'test-output/jest/coverage',
};
