/** Renderiza la app completa (rutas reales de `app/`) con el servidor simulado por defecto. */
import { router } from 'expo-router';
import { act, renderRouter } from 'expo-router/testing-library';

/**
 * `renderRouter` (SDK 57) llama a `render` sin esperar, pero en Testing Library 14
 * `render` es asíncrono: devuelve la promesa con los métodos del router añadidos.
 */
export async function renderizarApp(initialUrl = '/') {
  const app = renderRouter('./app', { initialUrl });
  await (app as unknown as Promise<unknown>);
  // Envuelto: si se devolviera `app`, la función async desenvolvería la promesa y
  // se perderían los métodos del router.
  return { segmentos: () => app.getSegments() };
}

/** `testRouter` también asume el render síncrono; se navega con la API imperativa. */
export async function navegar(ruta: Parameters<typeof router.navigate>[0]) {
  await act(async () => {
    router.navigate(ruta);
  });
}
