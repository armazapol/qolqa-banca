import {
  share,
  withNativeFederation,
} from '@angular-architects/native-federation/config';

/**
 * Remote "Inversiones" con Native Federation (ADR-0020).
 * Expone una función que registra el Web Component <bank-investments>.
 *
 * Solo se comparten Angular y RxJS (singletons para futuros remotes Angular).
 * El package.json raíz también contiene React y NestJS: compartirlo entero
 * generaría paquetes inútiles para este remote.
 */
const singleton = {
  singleton: true,
  strictVersion: true,
  requiredVersion: 'auto',
};

export default withNativeFederation({
  name: 'mf-investments',

  exposes: {
    './Element': './apps/mf-investments/src/element.ts',
  },

  shared: share({
    '@angular/core': { ...singleton, includeSecondaries: { keepAll: true } },
    '@angular/common': { ...singleton, includeSecondaries: { keepAll: true } },
    '@angular/platform-browser': {
      ...singleton,
      includeSecondaries: { keepAll: true },
    },
    '@angular/elements': {
      ...singleton,
      includeSecondaries: { keepAll: true },
    },
    rxjs: { ...singleton, includeSecondaries: { keepAll: true } },
  }),

  // Las animaciones de platform-browser dependen de @angular/animations (obsoleto):
  // se usa animate.enter, así que esos entrypoints no se publican.
  skip: [
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    '@angular/platform-browser/animations',
    '@angular/platform-browser/animations/async',
    // Los contratos se empaquetan dentro del remote (tree-shaking): como mapping
    // compartido se publicaban enteros, con Zod incluido (~92 KB gzip).
    '@qolqa/contracts',
  ],

  features: {
    denseChunking: true,
    denseExternals: true,
    strictImports: false,
  },
});
