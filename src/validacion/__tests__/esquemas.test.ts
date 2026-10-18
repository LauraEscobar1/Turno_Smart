import { esquemaLogin, esquemaRegistro } from '@/validacion/auth';
import { esquemaPreferencias, type ValoresPreferencias } from '@/validacion/preferencias';

const mensajes = (resultado: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) => Object.fromEntries((resultado.error?.issues ?? []).map((i) => [i.path.join('.'), i.message]));

describe('esquemaLogin', () => {
  it('acepta un correo válido (normalizado) y una contraseña de 8 caracteres', () => {
    const resultado = esquemaLogin.safeParse({
      email: '  Paciente@Demo.CO ',
      password: '12345678',
    });
    expect(resultado.success).toBe(true);
    expect(resultado.data?.email).toBe('paciente@demo.co');
  });

  it('exige correo y contraseña de al menos 8 caracteres', () => {
    expect(mensajes(esquemaLogin.safeParse({ email: '', password: '' }))).toEqual({
      email: 'Ingresa tu correo electrónico.',
      password: 'La contraseña debe tener al menos 8 caracteres.',
    });
    expect(
      mensajes(esquemaLogin.safeParse({ email: 'no-es-correo', password: '1234567' })),
    ).toEqual({
      email: 'Ingresa un correo electrónico válido.',
      password: 'La contraseña debe tener al menos 8 caracteres.',
    });
  });
});

describe('esquemaRegistro', () => {
  const valido = {
    nombre: 'Ana María Pérez',
    email: 'ana@correo.co',
    telefono: '',
    password: 'segura123',
    confirmacion: 'segura123',
  };

  it('acepta datos válidos y convierte el teléfono vacío en null', () => {
    const resultado = esquemaRegistro.safeParse(valido);
    expect(resultado.success).toBe(true);
    expect(resultado.data?.telefono).toBeNull();
  });

  it('valida nombre, teléfono y confirmación', () => {
    const resultado = esquemaRegistro.safeParse({
      ...valido,
      nombre: 'An',
      telefono: 'abc',
      confirmacion: 'otra-cosa',
    });
    expect(mensajes(resultado)).toEqual({
      nombre: 'Ingresa tu nombre completo.',
      telefono: 'Ingresa un teléfono válido (solo números, espacios o guiones).',
      confirmacion: 'Las contraseñas no coinciden.',
    });
  });

  it('acepta teléfonos con prefijo y separadores', () => {
    expect(esquemaRegistro.safeParse({ ...valido, telefono: '+57 300 123-4567' }).success).toBe(
      true,
    );
  });
});

describe('esquemaPreferencias', () => {
  const base: ValoresPreferencias = {
    especialidadIds: ['esp-1'],
    franjas: [{ diaSemana: 1, horaInicio: '08:00', horaFin: '12:00' }],
    distanciaMaxKm: 5,
    antelacionMinHoras: 2,
  };

  it('acepta preferencias válidas, incluida la distancia sin límite', () => {
    expect(esquemaPreferencias.safeParse(base).success).toBe(true);
    expect(esquemaPreferencias.safeParse({ ...base, distanciaMaxKm: null }).success).toBe(true);
  });

  it('exige que el inicio de la franja sea anterior al fin', () => {
    const resultado = esquemaPreferencias.safeParse({
      ...base,
      franjas: [{ diaSemana: 1, horaInicio: '12:00', horaFin: '12:00' }],
    });
    expect(mensajes(resultado)).toEqual({
      'franjas.0.horaFin': 'La hora de inicio debe ser anterior a la de fin.',
    });
  });

  it('rechaza franjas que se solapan el mismo día', () => {
    const resultado = esquemaPreferencias.safeParse({
      ...base,
      franjas: [
        { diaSemana: 1, horaInicio: '08:00', horaFin: '12:00' },
        { diaSemana: 1, horaInicio: '11:30', horaFin: '14:00' },
      ],
    });
    expect(mensajes(resultado)).toEqual({
      'franjas.1.horaInicio': 'Se cruza con otra franja del lunes.',
    });
  });

  it('permite franjas contiguas o en días distintos', () => {
    const resultado = esquemaPreferencias.safeParse({
      ...base,
      franjas: [
        { diaSemana: 1, horaInicio: '08:00', horaFin: '12:00' },
        { diaSemana: 1, horaInicio: '12:00', horaFin: '14:00' },
        { diaSemana: 2, horaInicio: '08:00', horaFin: '12:00' },
      ],
    });
    expect(resultado.success).toBe(true);
  });

  it('solo acepta las opciones predefinidas de distancia y antelación', () => {
    expect(esquemaPreferencias.safeParse({ ...base, distanciaMaxKm: 7 }).success).toBe(false);
    expect(esquemaPreferencias.safeParse({ ...base, antelacionMinHoras: 3 }).success).toBe(false);
  });

  it('rechaza especialidades repetidas y días inexistentes', () => {
    expect(esquemaPreferencias.safeParse({ ...base, especialidadIds: ['a', 'a'] }).success).toBe(
      false,
    );
    const diaInvalido = { ...base, franjas: [{ ...base.franjas[0]!, diaSemana: 7 }] };
    expect(esquemaPreferencias.safeParse(diaInvalido).success).toBe(false);
  });
});
