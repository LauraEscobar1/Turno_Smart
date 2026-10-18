/**
 * Una pantalla real de app/ con sus cuatro estados: carga, error (con reintento),
 * vacío y éxito.
 */
import { fireEvent, screen } from '@testing-library/react-native';

import Notificaciones from '../../../../app/(paciente)/notificaciones';
import { CUENTAS_DEMO } from '@/services/mock/semilla';
import { crearEntornoPrueba, renderConProveedores } from '@/test-utils/renderConProveedores';

describe('pantalla de notificaciones', () => {
  it('muestra la carga y luego las notificaciones, con el contador de no leídas', async () => {
    const { servicios, servidor } = crearEntornoPrueba();
    await servicios.auth.iniciarSesion(CUENTAS_DEMO.paciente);
    servidor.configurar({ latenciaMs: { min: 50, max: 50 } });

    await renderConProveedores(<Notificaciones />, servicios);

    expect(screen.getByText('Cargando notificaciones…')).toBeOnTheScreen();
    // Una oferta vigente y una histórica: dos avisos de "Nuevo cupo disponible".
    expect(await screen.findAllByText('Nuevo cupo disponible')).toHaveLength(2);
    expect(screen.getByText('1 sin leer')).toBeOnTheScreen();
  });

  it('si falla la conexión muestra el error y se recupera al reintentar', async () => {
    const { servicios, servidor } = crearEntornoPrueba();
    await servicios.auth.iniciarSesion(CUENTAS_DEMO.paciente);
    servidor.configurar({ fallos: 'siempre' });

    await renderConProveedores(<Notificaciones />, servicios);

    expect(await screen.findByText('Algo salió mal')).toBeOnTheScreen();
    expect(
      screen.getByText('No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.'),
    ).toBeOnTheScreen();

    servidor.configurar({ fallos: 'ninguno' });
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('1 sin leer')).toBeOnTheScreen();
  });

  it('una cuenta nueva ve el estado vacío', async () => {
    const { servicios } = crearEntornoPrueba();
    await servicios.auth.registrar({
      nombre: 'Paciente Nuevo',
      email: 'nuevo@correo.co',
      telefono: null,
      password: '12345678',
    });

    await renderConProveedores(<Notificaciones />, servicios);

    expect(await screen.findByText('Sin notificaciones')).toBeOnTheScreen();
  });

  it('marcar todas como leídas deja el contador en cero', async () => {
    const { servicios } = crearEntornoPrueba();
    await servicios.auth.iniciarSesion(CUENTAS_DEMO.paciente);
    await renderConProveedores(<Notificaciones />, servicios);

    await fireEvent.press(await screen.findByRole('button', { name: 'Marcar todas como leídas' }));

    expect(await screen.findByText('Todo leído')).toBeOnTheScreen();
    expect(await servicios.notificaciones.contarNoLeidas()).toBe(0);
  });
});
