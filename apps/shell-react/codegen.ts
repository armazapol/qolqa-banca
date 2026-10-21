import type { CodegenConfig } from '@graphql-codegen/cli';

/**
 * Tipos y documentos GraphQL a partir del esquema del BFF (apps/api/schema.graphql).
 * documentMode 'string': las consultas viajan como texto, sin incluir la librería
 * graphql en el bundle del navegador.
 */
const config: CodegenConfig = {
  schema: '../api/schema.graphql',
  documents: ['app/**/*.{ts,tsx}', '!app/generated/**'],
  ignoreNoDocuments: true,
  generates: {
    'app/generated/graphql/': {
      preset: 'client',
      config: {
        documentMode: 'string',
        enumsAsTypes: true,
        useTypeImports: true,
        scalars: { DateTime: 'string' },
      },
      presetConfig: { fragmentMasking: false },
    },
  },
};

export default config;
