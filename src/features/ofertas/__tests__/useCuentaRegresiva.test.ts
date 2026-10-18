import { act, renderHook } from '@testing-library/react-native';

import { useCuentaRegresiva } from '@/features/ofertas/hooks/useCuentaRegresiva';

describe('useCuentaRegresiva', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-20T15:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('avanza segundo a segundo y avisa una sola vez al llegar a cero', async () => {
    const alExpirar = jest.fn();
    const { result } = await renderHook(() =>
      useCuentaRegresiva('2026-10-20T15:00:03.000Z', { alExpirar }),
    );
    expect(result.current).toMatchObject({ segundos: 3, expirado: false });

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.segundos).toBe(2);

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current).toMatchObject({ totalMs: 0, expirado: true });
    expect(alExpirar).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(alExpirar).toHaveBeenCalledTimes(1);
  });

  it('inactiva (oferta respondida) no avisa aunque el plazo haya pasado', async () => {
    const alExpirar = jest.fn();
    await renderHook(() =>
      useCuentaRegresiva('2026-10-20T14:00:00.000Z', { activa: false, alExpirar }),
    );
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(alExpirar).not.toHaveBeenCalled();
  });
});
