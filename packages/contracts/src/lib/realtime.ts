import type { BankFxQuote } from './fx.js';
import type { Currency } from './money.js';

/** Namespaces de Socket.IO expuestos por el BFF. */
export const WS_NAMESPACES = {
  fx: '/fx',
  notifications: '/notifications',
} as const;

export const WS_EVENTS = {
  fxQuote: 'fx:quote',
  transferCompleted: 'transfer:completed',
  transferReceived: 'transfer:received',
} as const;

export interface TransferNotification {
  transferId: string;
  amountCents: number;
  currency: Currency;
  accountNumberMasked: string;
  createdAt: string;
}

export interface ServerToClientEvents {
  [WS_EVENTS.fxQuote]: (quote: BankFxQuote) => void;
  [WS_EVENTS.transferCompleted]: (payload: TransferNotification) => void;
  [WS_EVENTS.transferReceived]: (payload: TransferNotification) => void;
}
