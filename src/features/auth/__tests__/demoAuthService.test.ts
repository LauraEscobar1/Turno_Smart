import {
  crearDemoAuthService,
  ErrorModoDemo,
  esDemoAuthService,
  USUARIOS_DEMO,
} from '@/features/auth/demoAuthService';

describe('demoAuthService', () => {
  it('empieza sin sesión', async () => {
    const servicio = crearDemoAuthService();
    await expect(servicio.obtenerSesion()).resolves.toBeNull();
  });

  it('entra con el rol elegido y notifica a los suscriptores', async () => {
    const servicio = crearDemoAuthService();
    const oyente = jest.fn();
    servicio.suscribirse(oyente);

    const usuario = await servicio.entrarComo('staff');

    expect(usuario).toEqual(USUARIOS_DEMO.staff);
    await expect(servicio.obtenerSesion()).resolves.toEqual(USUARIOS_DEMO.staff);
    expect(oyente).toHaveBeenLastCalledWith(USUARIOS_DEMO.staff);
  });

  it('cerrar sesión limpia el usuario', async () => {
    const servicio = crearDemoAuthService();
    await servicio.entrarComo('paciente');
    await servicio.cerrarSesion();
    await expect(servicio.obtenerSesion()).resolves.toBeNull();
  });

  it('deja de notificar tras cancelar la suscripción', async () => {
    const servicio = crearDemoAuthService();
    const oyente = jest.fn();
    const cancelar = servicio.suscribirse(oyente);
    cancelar();
    await servicio.entrarComo('paciente');
    expect(oyente).not.toHaveBeenCalled();
  });

  it('rechaza el login y el registro reales con un mensaje claro', async () => {
    const servicio = crearDemoAuthService();
    await expect(
      servicio.iniciarSesion({ email: 'a@b.co', password: '12345678' }),
    ).rejects.toBeInstanceOf(ErrorModoDemo);
    await expect(
      servicio.registrar({ nombre: 'A', email: 'a@b.co', password: '12345678' }),
    ).rejects.toThrow('Fase 4');
  });

  it('se identifica como servicio demo', () => {
    expect(esDemoAuthService(crearDemoAuthService())).toBe(true);
  });
});
