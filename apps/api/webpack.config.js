const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
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
  ],
};
