import type { InvestmentsElementProps } from '@qolqa/contracts';
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

/** Tipado JSX del Web Component del microfrontend (ADR-0010). */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'bank-investments': DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > &
        Partial<InvestmentsElementProps>;
    }
  }
}
