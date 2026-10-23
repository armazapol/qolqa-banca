const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { sentryWebpackPlugin } = require('@sentry/webpack-plugin');
const { isAbsolute, join } = require('path');

/**
 * En Node no se empaquetan dependencias de node_modules: se instalan en el
 * servidor (binarios nativos como argon2 no pueden ir dentro del bundle).
 * Solo se incluyen el código de la app y las librerías del monorepo (@qolqa/*).
 */
function externalizeNodeModules({ request }, callback) {
  const isPackage =
    request &&
    !request.startsWith('.') &&
    !isAbsolute(request) &&
    !request.startsWith('@qolqa/');
  return isPackage ? callback(null, `commonjs ${request}`) : callback();
}

/**
 * Source maps a Sentry solo en el build de Render (ADR-0023), que aporta
 * SENTRY_AUTH_TOKEN, SENTRY_ORG y SENTRY_PROJECT. La release es el commit
 * desplegado (RENDER_GIT_COMMIT): el plugin la inyecta y Sentry.init la usa.
 */
const sentryPlugins = process.env.SENTRY_AUTH_TOKEN
  ? [
      sentryWebpackPlugin({
        release: { name: process.env.RENDER_GIT_COMMIT },
        telemetry: false,
      }),
    ]
  : [];

module.exports = {
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  externals: [externalizeNodeModules],
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      sourceMap: true,
      // Con pnpm las dependencias viven en apps/api/node_modules, que el plugin
      // no inspecciona: se combinan sus externals con externalizeNodeModules.
      mergeExternals: true,
    }),
    ...sentryPlugins,
  ],
};
