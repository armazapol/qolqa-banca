import { act, screen, waitFor } from '@testing-library/react';
import { ServerWakeNotice } from '../../app/components/ServerWakeNotice';
import {
  SLOW_REQUEST_MS,
  trackSlowRequest,
} from '../../app/lib/api/server-wake';
import { renderRoute } from '../render';

describe('ServerWakeNotice', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('avisa solo si una petición tarda más del umbral y desaparece al responder', async () => {
    renderRoute(ServerWakeNotice);
    let respond!: (value: string) => void;
    const request = trackSlowRequest(
      new Promise<string>((resolve) => (respond = resolve)),
    );

    act(() => jest.advanceTimersByTime(SLOW_REQUEST_MS - 1));
    expect(screen.queryByRole('status')).toBeNull();

    act(() => jest.advanceTimersByTime(1));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Despertando el servidor',
    );

    await act(async () => {
      respond('ok');
      await request;
    });
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it('una petición rápida no muestra nada', async () => {
    renderRoute(ServerWakeNotice);
    await act(() => trackSlowRequest(Promise.resolve('ok')));
    act(() => jest.advanceTimersByTime(SLOW_REQUEST_MS * 2));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
