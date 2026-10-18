import { ServiceError, type CodigoError } from '@/services/errores';
import { ServidorSimulado } from '@/services/mock/servidorSimulado';
import { IDS } from '@/services/mock/semilla';

/** Martes 20 de octubre de 2026, 09:00 (hora local). */
const INICIO = new Date(2026, 9, 20, 9, 0, 0);

function crearEntorno() {
  let ahora = new Date(INICIO);
  const servidor = new ServidorSimulado({
    reloj: () => ahora,
    latenciaMs: { min: 0, max: 0 },
  });
  return {
    servidor,
    avanzarMinutos: (minutos: number) => {
      ahora = new Date(ahora.getTime() + minutos * 60_000);
    },
  };
}

async function esperarError(promesa: Promise<unknown>, codigo: CodigoError) {
  await expect(promesa).rejects.toBeInstanceOf(ServiceError);
  await expect(promesa).rejects.toMatchObject({ codigo });
}

async function ofertaPendienteDemo(servidor: ServidorSimulado) {
  const ofertas = await servidor.listarOfertas(IDS.pacienteDemo);
  const pendiente = ofertas.find((o) => o.estado === 'pendiente');
  if (!pendiente) throw new Error('El escenario inicial debería dejar una oferta pendiente');
  return pendiente;
}

describe('servidor simulado', () => {
  describe('escenario inicial', () => {
    it('el paciente demo tiene una oferta pendiente de 15 minutos, con su explicación', async () => {
      const { servidor } = crearEntorno();
      const oferta = await ofertaPendienteDemo(servidor);

      expect(oferta.especialidad.id).toBe(IDS.medicinaGeneral);
      expect(oferta.ronda).toBe(1);
      expect(new Date(oferta.expiraEn).getTime() - INICIO.getTime()).toBe(15 * 60_000);
      expect(oferta.explicacion.fuente).toBe('regla_simulada');
      expect(oferta.explicacion.factores.tiempoEspera.detalle).toMatch(/28 días/);
      expect(await servidor.contarNoLeidas(IDS.pacienteDemo)).toBe(1);
    });
  });

  describe('cancelaciones', () => {
    it('cancelar dos veces la misma cita no crea dos cupos', async () => {
      const { servidor } = crearEntorno();
      const citaId = IDS.citaDemoProxima;

      await servidor.cancelarCita(IDS.pacienteDemo, citaId);
      await esperarError(servidor.cancelarCita(IDS.pacienteDemo, citaId), 'transicion_invalida');
      // Ni siquiera si el staff también registra la cancelación.
      await esperarError(
        servidor.registrarCancelacion(IDS.staffCentro, citaId),
        'transicion_invalida',
      );

      const cupos = servidor.instantanea().cupos.filter((c) => c.citaOrigenId === citaId);
      expect(cupos).toHaveLength(1);
    });

    it('cancelar con menos de 30 minutos de margen no libera un cupo ofertable', async () => {
      const { servidor, avanzarMinutos } = crearEntorno();
      const cita = servidor.instantanea().citas.find((c) => c.id === IDS.citaDemoProxima)!;
      avanzarMinutos((new Date(cita.fechaHora).getTime() - INICIO.getTime()) / 60_000 - 20);

      await servidor.cancelarCita(IDS.pacienteDemo, cita.id);

      expect(servidor.instantanea().cupos.some((c) => c.citaOrigenId === cita.id)).toBe(false);
    });

    it('una cita que ya comenzó no se cancela: se registra como inasistencia', async () => {
      const { servidor } = crearEntorno();
      await esperarError(
        servidor.registrarCancelacion(IDS.staffCentro, IDS.citaComenzada),
        'cita_ya_comenzo',
      );
      const cita = await servidor.registrarInasistencia(IDS.staffCentro, IDS.citaComenzada);
      expect(cita.estado).toBe('inasistencia');
    });

    it('no se registra inasistencia de una cita que aún no comienza', async () => {
      const { servidor } = crearEntorno();
      await esperarError(
        servidor.registrarInasistencia(IDS.staffCentro, IDS.citaDemoProxima),
        'cita_no_comenzo',
      );
    });

    it('cuando el staff cancela, el paciente recibe una notificación', async () => {
      const { servidor } = crearEntorno();
      await servidor.registrarCancelacion(IDS.staffCentro, IDS.citaDemoProxima);
      const notificaciones = await servidor.listarNotificaciones(IDS.pacienteDemo);
      expect(notificaciones[0]?.tipo).toBe('cita_cancelada');
    });
  });

  describe('responder ofertas', () => {
    it('aceptar crea la cita recuperada, asigna el cupo y atiende la solicitud', async () => {
      const { servidor } = crearEntorno();
      const oferta = await ofertaPendienteDemo(servidor);

      const respondida = await servidor.responderOferta(IDS.pacienteDemo, oferta.id, 'aceptar');

      expect(respondida.estado).toBe('aceptada');
      const citas = await servidor.listarCitas(IDS.pacienteDemo);
      const nueva = citas.find((c) => c.cupoOrigenId === oferta.cupoId);
      expect(nueva).toMatchObject({ estado: 'confirmada', origen: 'cupo_recuperado' });

      const estado = servidor.instantanea();
      expect(estado.cupos.find((c) => c.id === oferta.cupoId)).toMatchObject({
        estado: 'asignado',
        citaAsignadaId: nueva?.id,
      });
      expect(estado.solicitudes.find((s) => s.id === 'sol-demo-mg')?.estado).toBe('atendida');
    });

    it('no se puede aceptar una oferta expirada', async () => {
      const { servidor, avanzarMinutos } = crearEntorno();
      const oferta = await ofertaPendienteDemo(servidor);
      avanzarMinutos(16);

      await esperarError(
        servidor.responderOferta(IDS.pacienteDemo, oferta.id, 'aceptar'),
        'oferta_expirada',
      );
      const actualizada = await servidor.obtenerOferta(IDS.pacienteDemo, oferta.id);
      expect(actualizada.estado).toBe('expirada');
    });

    it('no se puede responder dos veces la misma oferta', async () => {
      const { servidor } = crearEntorno();
      const oferta = await ofertaPendienteDemo(servidor);
      await servidor.responderOferta(IDS.pacienteDemo, oferta.id, 'rechazar');

      await esperarError(
        servidor.responderOferta(IDS.pacienteDemo, oferta.id, 'aceptar'),
        'oferta_ya_respondida',
      );
    });

    it('al rechazar, el cupo se ofrece al siguiente candidato en una nueva ronda', async () => {
      const { servidor } = crearEntorno();
      const oferta = await ofertaPendienteDemo(servidor);

      await servidor.responderOferta(IDS.pacienteDemo, oferta.id, 'rechazar');

      const delCupo = servidor.instantanea().ofertas.filter((o) => o.cupoId === oferta.cupoId);
      const siguiente = delCupo.find((o) => o.estado === 'pendiente');
      expect(siguiente).toBeDefined();
      expect(siguiente?.ronda).toBe(2);
      expect(siguiente?.pacienteId).not.toBe(IDS.pacienteDemo);
      // Quien canceló la cita original nunca recibe su propio cupo.
      expect(siguiente?.pacienteId).not.toBe(IDS.pedro);
    });

    it('al expirar, también pasa al siguiente candidato', async () => {
      const { servidor, avanzarMinutos } = crearEntorno();
      const oferta = await ofertaPendienteDemo(servidor);
      avanzarMinutos(16);

      expect(servidor.expirarOfertas()).toBeGreaterThan(0);

      const delCupo = servidor.instantanea().ofertas.filter((o) => o.cupoId === oferta.cupoId);
      expect(delCupo.map((o) => [o.ronda, o.estado])).toEqual([
        [1, 'expirada'],
        [2, 'pendiente'],
      ]);
    });

    it('si llega la hora del cupo sin asignarse, la oferta se cancela y el cupo expira', async () => {
      const { servidor, avanzarMinutos } = crearEntorno();
      const oferta = await ofertaPendienteDemo(servidor);
      const minutosHastaCupo = (new Date(oferta.fechaHora).getTime() - INICIO.getTime()) / 60_000;
      // Se adelanta el reloj hasta 29 minutos antes del cupo, sin que nadie responda.
      avanzarMinutos(minutosHastaCupo - 29);
      servidor.expirarOfertas();

      const estado = servidor.instantanea();
      expect(estado.cupos.find((c) => c.id === oferta.cupoId)?.estado).toBe('expirado');
      expect(
        estado.ofertas.filter((o) => o.cupoId === oferta.cupoId && o.estado === 'pendiente'),
      ).toHaveLength(0);
    });
  });

  describe('aislamiento de datos', () => {
    it('un paciente no ve ni responde las ofertas de otro', async () => {
      const { servidor } = crearEntorno();
      const ofertaDemo = await ofertaPendienteDemo(servidor);

      const deCarlos = await servidor.listarOfertas(IDS.carlos);
      expect(deCarlos.some((o) => o.id === ofertaDemo.id)).toBe(false);
      expect(deCarlos.every((o) => o.pacienteId === IDS.carlos)).toBe(true);

      await esperarError(servidor.obtenerOferta(IDS.carlos, ofertaDemo.id), 'no_encontrado');
      await esperarError(
        servidor.responderOferta(IDS.carlos, ofertaDemo.id, 'aceptar'),
        'no_encontrado',
      );
      await esperarError(servidor.cancelarCita(IDS.carlos, IDS.citaDemoProxima), 'no_encontrado');
    });

    it('el staff no ve ni modifica datos de otro consultorio', async () => {
      const { servidor } = crearEntorno();
      const cuposCentro = await servidor.listarCupos(IDS.staffCentro);
      expect(cuposCentro.length).toBeGreaterThan(0);

      const cuposNorte = await servidor.listarCupos(IDS.staffNorte);
      expect(cuposNorte.every((c) => c.consultorioId === IDS.norte)).toBe(true);
      expect(cuposNorte.some((c) => cuposCentro.some((cc) => cc.id === c.id))).toBe(false);

      await esperarError(servidor.obtenerCupo(IDS.staffNorte, cuposCentro[0]!.id), 'no_encontrado');
      await esperarError(
        servidor.registrarCancelacion(IDS.staffNorte, IDS.citaDemoProxima),
        'no_encontrado',
      );

      const agendaNorte = await servidor.listarAgenda(IDS.staffNorte);
      expect(agendaNorte.every((c) => c.consultorioId === IDS.norte)).toBe(true);
      const enCursoNorte = await servidor.listarOfertasEnCurso(IDS.staffNorte);
      expect(enCursoNorte.every((o) => !cuposCentro.some((c) => c.id === o.cupoId))).toBe(true);
    });

    it('el staff solo recibe iniciales y un código del paciente', async () => {
      const { servidor } = crearEntorno();
      const oferta = await ofertaPendienteDemo(servidor);

      const cupo = await servidor.obtenerCupo(IDS.staffCentro, oferta.cupoId);
      const ronda = cupo.rondas[0]!;
      expect(Object.keys(ronda.paciente).sort()).toEqual(['codigo', 'iniciales']);
      expect(ronda.paciente.iniciales).toBe('MR');

      const serializado = JSON.stringify([cupo, await servidor.listarAgenda(IDS.staffCentro)]);
      expect(serializado).not.toMatch(/Mariana|Rojas|@demo\.turnosmart/);
    });

    it('cada rol solo puede usar sus operaciones', async () => {
      const { servidor } = crearEntorno();
      await esperarError(servidor.listarCupos(IDS.pacienteDemo), 'prohibido');
      await esperarError(servidor.listarOfertas(IDS.staffCentro), 'prohibido');
      await esperarError(servidor.listarOfertas(null), 'no_autenticado');
    });
  });

  describe('lista de espera', () => {
    it('no permite dos solicitudes activas de la misma especialidad', async () => {
      const { servidor } = crearEntorno();
      await esperarError(
        servidor.unirseALista(IDS.pacienteDemo, IDS.medicinaGeneral),
        'solicitud_duplicada',
      );
      const nueva = await servidor.unirseALista(IDS.pacienteDemo, IDS.pediatria);
      expect(nueva.estado).toBe('activa');
    });

    it('salir de la lista cancela la solicitud y no se puede repetir', async () => {
      const { servidor } = crearEntorno();
      const salida = await servidor.salirDeLista(IDS.pacienteDemo, 'sol-demo-mg');
      expect(salida.estado).toBe('cancelada');
      await esperarError(
        servidor.salirDeLista(IDS.pacienteDemo, 'sol-demo-mg'),
        'transicion_invalida',
      );
    });

    it('unirse a la lista ofrece de inmediato un cupo disponible compatible', async () => {
      const { servidor } = crearEntorno();
      // Pedro rechaza su cupo de pediatría y no queda nadie más: el cupo queda disponible.
      const [ofertaPedro] = (await servidor.listarOfertas(IDS.pedro)).filter(
        (o) => o.estado === 'pendiente',
      );
      await servidor.responderOferta(IDS.pedro, ofertaPedro!.id, 'rechazar');
      const cupo = servidor.instantanea().cupos.find((c) => c.id === ofertaPedro!.cupoId);
      expect(cupo?.estado).toBe('disponible');

      // Ana se une a la lista de pediatría y recibe el cupo al instante.
      await servidor.unirseALista(IDS.ana, IDS.pediatria);
      const deAna = await servidor.listarOfertas(IDS.ana);
      expect(deAna.find((o) => o.cupoId === cupo?.id)?.estado).toBe('pendiente');
    });
  });

  describe('autenticación', () => {
    it('rechaza credenciales incorrectas', async () => {
      const { servidor } = crearEntorno();
      await esperarError(
        servidor.iniciarSesion({ email: 'paciente@demo.turnosmart.co', password: 'otra-clave' }),
        'credenciales_invalidas',
      );
    });

    it('registra un paciente nuevo, sin datos previos, y no permite repetir el correo', async () => {
      const { servidor } = crearEntorno();
      const datos = {
        nombre: 'Paciente Nuevo',
        email: 'Nuevo@Correo.co',
        telefono: null,
        password: '12345678',
      };
      const perfil = await servidor.registrarPaciente(datos);

      expect(perfil).toMatchObject({ rol: 'paciente', email: 'nuevo@correo.co' });
      expect(await servidor.listarOfertas(perfil.id)).toEqual([]);
      await esperarError(servidor.registrarPaciente(datos), 'email_en_uso');
      const sesion = await servidor.iniciarSesion({
        email: 'nuevo@correo.co',
        password: '12345678',
      });
      expect(sesion.id).toBe(perfil.id);
    });
  });

  describe('red simulada', () => {
    it('con fallos activos, la petición falla y no modifica nada', async () => {
      const { servidor } = crearEntorno();
      servidor.configurar({ fallos: 'siempre' });

      await esperarError(
        servidor.cancelarCita(IDS.pacienteDemo, IDS.citaDemoProxima),
        'sin_conexion',
      );

      servidor.configurar({ fallos: 'ninguno' });
      const cita = (await servidor.listarCitas(IDS.pacienteDemo)).find(
        (c) => c.id === IDS.citaDemoProxima,
      );
      expect(cita?.estado).toBe('programada');
    });

    it('devuelve copias: modificar el resultado no cambia el servidor', async () => {
      const { servidor } = crearEntorno();
      const oferta = await ofertaPendienteDemo(servidor);
      oferta.estado = 'aceptada';
      expect((await ofertaPendienteDemo(servidor)).estado).toBe('pendiente');
    });
  });

  describe('panel', () => {
    it('calcula las métricas del consultorio del staff', async () => {
      const { servidor } = crearEntorno();
      const metricas = await servidor.obtenerMetricas(IDS.staffCentro);
      expect(metricas).toMatchObject({
        cancelaciones: 4,
        cuposLiberados: 4,
        cuposRecuperados: 1,
        inasistencias: 2,
        ofertasPendientes: 2,
      });
      expect(metricas.tasaRecuperacion).toBeCloseTo(0.25);
    });

    it('la agenda incluye una estimación ficticia de riesgo por cita activa', async () => {
      const { servidor } = crearEntorno();
      const agenda = await servidor.listarAgenda(IDS.staffCentro);
      const jorge = agenda.find((c) => c.id === 'cita-a3');
      expect(jorge?.riesgo).toMatchObject({ nivel: 'alto', fuente: 'estimacion_ficticia' });
      expect(agenda.filter((c) => c.estado === 'cancelada').every((c) => c.riesgo === null)).toBe(
        true,
      );
    });
  });
});
