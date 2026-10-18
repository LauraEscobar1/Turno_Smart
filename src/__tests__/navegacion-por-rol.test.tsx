/**
 * Integración con las rutas reales de `app/`: comprueba la redirección según la
 * sesión y que un rol no puede abrir las rutas del otro.
 */
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

/**
 * `renderRouter` (SDK 57) llama a `render` sin esperar, pero en Testing Library 14
 * `render` es asíncrono: devuelve la promesa con los métodos del router añadidos.
 */
async function renderizarApp(initialUrl = '/') {
  const app = renderRouter('./app', { initialUrl });
  await (app as unknown as Promise<unknown>);
  // Envuelto: si se devolviera `app`, la función async desenvolvería la promesa y
  // se perderían los métodos del router.
  return { segmentos: () => app.getSegments() };
}

/** `testRouter` también asume el render síncrono; se navega con la API imperativa. */
async function navegar(ruta: Parameters<typeof router.navigate>[0]) {
  await act(async () => {
    router.navigate(ruta);
  });
}

describe('navegación por rol (modo demo)', () => {
  it('redirige según la sesión y protege las rutas de cada rol', async () => {
    const app = await renderizarApp();

    // Sin sesión → login, y las rutas protegidas no se pueden abrir.
    expect(await screen.findByText('MODO DEMO')).toBeOnTheScreen();
    expect(app.segmentos()).toEqual(['(auth)', 'login']);
    await navegar('/(staff)/panel');
    expect(app.segmentos()).toEqual(['(auth)', 'login']);

    // Staff → panel. No puede abrir las ofertas del paciente.
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar como staff demo' }));
    expect(await screen.findByText('Panel del consultorio')).toBeOnTheScreen();
    expect(app.segmentos()).toEqual(['(staff)', 'panel']);
    await navegar('/(paciente)/ofertas');
    expect(app.segmentos()[0]).toBe('(staff)');
    // Control: navegar dentro del propio rol sí funciona (la prueba anterior no es vacía).
    await navegar('/(staff)/cupos');
    expect(app.segmentos()).toEqual(['(staff)', 'cupos']);

    // Cerrar sesión → vuelve al login.
    await fireEvent.press(screen.getByRole('button', { name: /^Perfil, tab/ }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Cerrar sesión' }));
    expect(await screen.findByText('MODO DEMO')).toBeOnTheScreen();
    expect(app.segmentos()).toEqual(['(auth)', 'login']);

    // Paciente → ofertas. No puede abrir el panel del staff.
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar como paciente demo' }));
    expect(await screen.findByText('Ofertas de cupos')).toBeOnTheScreen();
    expect(app.segmentos().slice(0, 2)).toEqual(['(paciente)', 'ofertas']);
    await navegar('/(staff)/panel');
    expect(app.segmentos()[0]).toBe('(paciente)');
  });
});
