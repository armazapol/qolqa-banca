import { act, renderHook } from '@testing-library/react';
import { useIdleTimeout } from '../../app/features/session/useIdleTimeout';

const WARN = 4 * 60_000;
const TIMEOUT = 5 * 60_000;

describe('useIdleTimeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const setup = () => {
    const onTimeout = jest.fn();
    const hook = renderHook(() =>
      useIdleTimeout({ warnAfterMs: WARN, timeoutMs: TIMEOUT, onTimeout }),
    );
    return { ...hook, onTimeout };
  };

  it('avisa a los 4 minutos y cierra la sesión a los 5', () => {
    const { result, onTimeout } = setup();

    act(() => jest.advanceTimersByTime(WARN + 1_000));
    expect(result.current.warning).toBe(true);
    expect(result.current.secondsLeft).toBeLessThanOrEqual(60);
    expect(onTimeout).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(60_000));
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('la actividad del usuario reinicia el contador', () => {
    const { result, onTimeout } = setup();

    act(() => jest.advanceTimersByTime(3 * 60_000));
    act(() => {
      window.dispatchEvent(new Event('keydown'));
    });
    act(() => jest.advanceTimersByTime(3 * 60_000));

    expect(result.current.warning).toBe(false);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('durante el aviso solo "Seguir conectado" extiende la sesión', () => {
    const { result, onTimeout } = setup();

    act(() => jest.advanceTimersByTime(WARN + 1_000));
    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    expect(result.current.warning).toBe(true);

    act(() => result.current.stayActive());
    expect(result.current.warning).toBe(false);
    act(() => jest.advanceTimersByTime(WARN - 1_000));
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
