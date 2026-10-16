import { USUARIOS_DEMO } from '@/features/auth/demoAuthService';
import { grupoPara, puedeAcceder, rutaInicialPara, RUTAS } from '@/features/auth/rutas';

const { paciente, staff } = USUARIOS_DEMO;

describe('rutas por rol', () => {
  it('sin sesión envía al login', () => {
    expect(grupoPara(null)).toBe('(auth)');
    expect(rutaInicialPara(null)).toBe(RUTAS.login);
  });

  it('el paciente empieza en sus ofertas', () => {
    expect(grupoPara(paciente)).toBe('(paciente)');
    expect(rutaInicialPara(paciente)).toBe('/(paciente)/ofertas');
  });

  it('el staff empieza en el panel', () => {
    expect(grupoPara(staff)).toBe('(staff)');
    expect(rutaInicialPara(staff)).toBe('/(staff)/panel');
  });

  it.each([
    ['sin sesión', null, '(auth)'],
    ['paciente', paciente, '(paciente)'],
    ['staff', staff, '(staff)'],
  ] as const)('%s solo accede a su propio grupo', (_caso, usuario, propio) => {
    const grupos = ['(auth)', '(paciente)', '(staff)'] as const;
    for (const grupo of grupos) {
      expect(puedeAcceder(usuario, grupo)).toBe(grupo === propio);
    }
  });
});
