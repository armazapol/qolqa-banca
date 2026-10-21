const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: 'api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  // Los tests usan el código fuente de @qolqa/contracts (ESM con imports .js).
  moduleNameMapper: {
    '^@qolqa/contracts$': '<rootDir>/../../packages/contracts/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // otplib depende de @scure/@noble, publicados solo como ESM: Jest debe transformarlos.
  transformIgnorePatterns: ['/node_modules/(?!(\\.pnpm/)?(@scure|@noble))'],
  coverageDirectory: 'test-output/jest/coverage',
};
