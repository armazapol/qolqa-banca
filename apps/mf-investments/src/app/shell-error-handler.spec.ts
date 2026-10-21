import { INVESTMENTS_EVENTS } from '@qolqa/contracts';
import { ShellErrorHandler } from './shell-error-handler';

describe('ShellErrorHandler', () => {
  it('entrega los errores no controlados al shell con su stack', () => {
    const received: CustomEvent[] = [];
    const listener = (event: Event) => received.push(event as CustomEvent);
    window.addEventListener(INVESTMENTS_EVENTS.error, listener);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    new ShellErrorHandler().handleError(new Error('fallo de render'));

    expect(received[0]?.detail).toEqual({
      kind: 'unknown',
      message: 'fallo de render',
      stack: expect.stringContaining('fallo de render'),
    });
    window.removeEventListener(INVESTMENTS_EVENTS.error, listener);
  });
});
