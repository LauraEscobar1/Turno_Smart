/**
 * ⚠️ SERVIDOR SIMULADO (modo demo, Fase 2).
 *
 * Imita en memoria lo que hará el backend de Supabase en la Fase 3:
 * - "RLS": cada operación recibe el id de quien la ejecuta (el "JWT") y solo
 *   devuelve lo que le corresponde. Lo ajeno responde `no_encontrado`.
 * - Reglas de negocio: máquinas de estado de `src/constants/estados.ts`.
 * - "Cron": antes de cada petición se ejecuta `expirarOfertas()`.
 * - Red: latencia artificial y fallos simulables.
 * Devuelve siempre copias: la interfaz nunca modifica su estado por referencia.
 */
import {
  CANCELADA_POR,
  esEstadoTerminal,
  ESTADOS_CITA_ACTIVOS,
  type EstadosPorMaquina,
  type Maquina,
  puedeTransicionar,
} from '@/constants/estados';
import {
  DURACION_OFERTA_MIN,
  MARGEN_CIERRE_CUPO_MIN,
  PERIODO_METRICAS_DIAS,
} from '@/constants/reglas';
import type {
  CanceladaPor,
  Cita,
  CitaAgenda,
  CitaDetalle,
  CupoConLineaDeTiempo,
  CupoDetalle,
  CupoLiberado,
  Especialidad,
  MetricasPanel,
  Notificacion,
  Oferta,
  OfertaDetalle,
  OfertaEnCurso,
  Perfil,
  PreferenciasPaciente,
  ReferenciaPaciente,
  SolicitudDetalle,
  TipoEventoOferta,
  TipoNotificacion,
} from '@/types';
import { formatearFechaHora, inicioDelDia } from '@/utils/fechas';
import { obtenerIniciales } from '@/utils/texto';
import { esquemaDatosRegistro, esquemaLogin } from '@/validacion/auth';
import { esquemaPreferencias, type DatosPreferencias } from '@/validacion/preferencias';

import type { Credenciales, DatosRegistro } from '../auth';
import { ServiceError } from '../errores';
import type { RespuestaOferta } from '../ofertas';
import type { RangoAgenda } from '../panel';
import type { ModoFallos } from '../servicios';
import { evaluarCandidatos } from './reglaPriorizacion';
import { estimarRiesgoFicticio } from './riesgoFicticio';
import { crearSemilla, type BaseDeDatos } from './semilla';

export interface ConfigServidor {
  latenciaMs: { min: number; max: number };
  fallos: ModoFallos;
}

export interface OpcionesServidor extends Partial<ConfigServidor> {
  /** Reloj inyectable (las pruebas lo controlan). */
  reloj?: () => Date;
  /** Fuente de aleatoriedad para latencia y fallos intermitentes. */
  aleatorio?: () => number;
  /** false: no genera las ofertas "en vivo" al arrancar. */
  escenarioInicial?: boolean;
}

export const LATENCIA_POR_DEFECTO = { min: 300, max: 800 } as const;
const PROBABILIDAD_FALLO_INTERMITENTE = 0.3;
const MS_MIN = 60_000;
const MS_DIA = 24 * 60 * MS_MIN;

const clonar = <T>(valor: T): T => JSON.parse(JSON.stringify(valor)) as T;
const iso = (fecha: Date) => fecha.toISOString();

/** Código corto y estable para referirse a un paciente sin exponer su identidad. */
export function codigoPaciente(id: string): string {
  let hash = 7;
  for (const caracter of id) hash = (hash * 31 + caracter.charCodeAt(0)) >>> 0;
  return `P-${hash.toString(36).toUpperCase().padStart(4, '0').slice(-4)}`;
}

export class ServidorSimulado {
  private db!: BaseDeDatos;
  private secuencia = 0;
  private config: ConfigServidor;
  private readonly reloj: () => Date;
  private readonly aleatorio: () => number;
  private readonly escenarioInicial: boolean;

  constructor(opciones: OpcionesServidor = {}) {
    this.config = {
      latenciaMs: opciones.latenciaMs ?? { ...LATENCIA_POR_DEFECTO },
      fallos: opciones.fallos ?? 'ninguno',
    };
    this.reloj = opciones.reloj ?? (() => new Date());
    this.aleatorio = opciones.aleatorio ?? Math.random;
    this.escenarioInicial = opciones.escenarioInicial ?? true;
    this.restablecer();
  }

  // ═════════════ Configuración y depuración ═════════════

  /** Vuelve a generar los datos ficticios relativos a ahora. */
  restablecer(): void {
    const { db, cancelacionesIniciales } = crearSemilla(this.reloj());
    this.db = db;
    this.secuencia = 0;
    if (!this.escenarioInicial) return;
    for (const { citaId, por } of cancelacionesIniciales) {
      this.cancelarCitaInterna(this.buscar(this.db.citas, citaId), por);
    }
  }

  configurar(parcial: Partial<ConfigServidor>): void {
    this.config = { ...this.config, ...parcial };
  }

  obtenerConfig(): ConfigServidor {
    return clonar(this.config);
  }

  /** Copia del estado interno. Solo para pruebas y depuración. */
  instantanea() {
    const { cupos, ofertas, citas, solicitudes, notificaciones, eventos } = this.db;
    return clonar({ cupos, ofertas, citas, solicitudes, notificaciones, eventos });
  }

  // ═════════════ Autenticación ═════════════

  iniciarSesion(credenciales: Credenciales): Promise<Perfil> {
    return this.peticion(() => {
      const datos = esquemaLogin.safeParse(credenciales);
      if (!datos.success) throw new ServiceError('validacion');
      const credencial = this.db.credenciales.get(datos.data.email);
      if (!credencial || credencial.password !== datos.data.password) {
        throw new ServiceError('credenciales_invalidas');
      }
      return this.buscar(this.db.perfiles, credencial.perfilId);
    });
  }

  registrarPaciente(datosRegistro: DatosRegistro): Promise<Perfil> {
    return this.peticion(() => {
      const datos = esquemaDatosRegistro.safeParse(datosRegistro);
      if (!datos.success) throw new ServiceError('validacion');
      const { nombre, email, telefono, password } = datos.data;
      if (this.db.credenciales.has(email)) throw new ServiceError('email_en_uso');

      const ahora = iso(this.reloj());
      const perfil: Perfil = {
        id: this.nuevoId('pac'),
        nombre,
        email,
        telefono,
        rol: 'paciente',
        consultorioId: null,
        ubicacionAproximada: null,
        creadoEn: ahora,
      };
      this.db.perfiles.push(perfil);
      this.db.credenciales.set(email, { perfilId: perfil.id, password });
      this.db.preferencias.set(perfil.id, {
        pacienteId: perfil.id,
        especialidadIds: [],
        franjas: [],
        distanciaMaxKm: null,
        antelacionMinHoras: 2,
        actualizadoEn: ahora,
      });
      return perfil;
    });
  }

  /** Valida una sesión guardada (el "token" es el id del perfil). */
  obtenerPerfilPorId(perfilId: string): Promise<Perfil | null> {
    return this.peticion(() => this.db.perfiles.find((p) => p.id === perfilId) ?? null);
  }

  perfilActual(actorId: string | null): Promise<Perfil> {
    return this.peticion(() => this.actor(actorId));
  }

  // ═════════════ Catálogo ═════════════

  listarEspecialidades(actorId: string | null): Promise<Especialidad[]> {
    return this.peticion(() => {
      this.actor(actorId);
      return [...this.db.especialidades].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    });
  }

  // ═════════════ Paciente: preferencias ═════════════

  obtenerPreferencias(actorId: string | null): Promise<PreferenciasPaciente> {
    return this.peticion(() => this.preferenciasDe(this.paciente(actorId).id));
  }

  guardarPreferencias(
    actorId: string | null,
    datos: DatosPreferencias,
  ): Promise<PreferenciasPaciente> {
    return this.peticion(() => {
      const paciente = this.paciente(actorId);
      const validadas = esquemaPreferencias.safeParse(datos);
      if (!validadas.success) throw new ServiceError('validacion');
      const ids = new Set(this.db.especialidades.map((e) => e.id));
      if (!validadas.data.especialidadIds.every((id) => ids.has(id))) {
        throw new ServiceError('validacion', 'Especialidad desconocida');
      }
      const preferencias: PreferenciasPaciente = {
        pacienteId: paciente.id,
        ...validadas.data,
        actualizadoEn: iso(this.reloj()),
      };
      this.db.preferencias.set(paciente.id, preferencias);
      this.reofertarDisponibles();
      return preferencias;
    });
  }

  // ═════════════ Paciente: lista de espera ═════════════

  listarSolicitudes(actorId: string | null): Promise<SolicitudDetalle[]> {
    return this.peticion(() => {
      const paciente = this.paciente(actorId);
      return this.db.solicitudes
        .filter((s) => s.pacienteId === paciente.id)
        .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))
        .map((s) => ({
          ...s,
          especialidad: this.buscar(this.db.especialidades, s.especialidadId),
        }));
    });
  }

  unirseALista(actorId: string | null, especialidadId: string): Promise<SolicitudDetalle> {
    return this.peticion(() => {
      const paciente = this.paciente(actorId);
      const especialidad = this.db.especialidades.find((e) => e.id === especialidadId);
      if (!especialidad) throw new ServiceError('no_encontrado');
      const duplicada = this.db.solicitudes.some(
        (s) =>
          s.pacienteId === paciente.id &&
          s.especialidadId === especialidadId &&
          s.estado === 'activa',
      );
      if (duplicada) throw new ServiceError('solicitud_duplicada');

      const solicitud = {
        id: this.nuevoId('sol'),
        pacienteId: paciente.id,
        especialidadId,
        estado: 'activa' as const,
        creadaEn: iso(this.reloj()),
        cerradaEn: null,
      };
      this.db.solicitudes.push(solicitud);
      // Quizás ya hay un cupo esperando a alguien como este paciente.
      this.reofertarDisponibles();
      return { ...solicitud, especialidad };
    });
  }

  salirDeLista(actorId: string | null, solicitudId: string): Promise<SolicitudDetalle> {
    return this.peticion(() => {
      const paciente = this.paciente(actorId);
      const solicitud = this.db.solicitudes.find(
        (s) => s.id === solicitudId && s.pacienteId === paciente.id,
      );
      if (!solicitud) throw new ServiceError('no_encontrado');
      this.transicionar('solicitud', solicitud, 'cancelada');
      solicitud.cerradaEn = iso(this.reloj());

      // Si ya no le interesa la especialidad, su oferta pendiente pasa al siguiente.
      const interesado = this.preferenciasDe(paciente.id).especialidadIds.includes(
        solicitud.especialidadId,
      );
      if (!interesado) {
        for (const oferta of this.ofertasPendientesDe(paciente.id)) {
          const cupo = this.buscar(this.db.cupos, oferta.cupoId);
          if (cupo.especialidadId !== solicitud.especialidadId) continue;
          this.cerrarOferta(oferta, 'cancelada');
          this.ofrecerAlSiguiente(cupo);
        }
      }
      return {
        ...solicitud,
        especialidad: this.buscar(this.db.especialidades, solicitud.especialidadId),
      };
    });
  }

  // ═════════════ Paciente: ofertas ═════════════

  listarOfertas(actorId: string | null): Promise<OfertaDetalle[]> {
    return this.peticion(() => {
      const paciente = this.paciente(actorId);
      const fechaCierre = (o: Oferta) => o.respondidaEn ?? o.expiraEn;
      return this.db.ofertas
        .filter((o) => o.pacienteId === paciente.id)
        .sort((a, b) => {
          if (a.estado === 'pendiente' && b.estado === 'pendiente') {
            return a.expiraEn.localeCompare(b.expiraEn);
          }
          if (a.estado === 'pendiente') return -1;
          if (b.estado === 'pendiente') return 1;
          return fechaCierre(b).localeCompare(fechaCierre(a));
        })
        .map((o) => this.detalleOferta(o));
    });
  }

  obtenerOferta(actorId: string | null, ofertaId: string): Promise<OfertaDetalle> {
    return this.peticion(() => this.detalleOferta(this.ofertaPropia(actorId, ofertaId)));
  }

  /** Operación crítica: la decisión final siempre es del servidor. */
  responderOferta(
    actorId: string | null,
    ofertaId: string,
    respuesta: RespuestaOferta,
  ): Promise<OfertaDetalle> {
    return this.peticion(() => {
      // `peticion` ya ejecutó expirarOfertas(): si venció, ahora figura como expirada.
      const oferta = this.ofertaPropia(actorId, ofertaId);
      if (oferta.estado === 'expirada') throw new ServiceError('oferta_expirada');
      if (oferta.estado === 'cancelada') throw new ServiceError('cupo_no_disponible');
      if (oferta.estado !== 'pendiente') throw new ServiceError('oferta_ya_respondida');

      const cupo = this.buscar(this.db.cupos, oferta.cupoId);
      if (cupo.estado !== 'ofertando') throw new ServiceError('cupo_no_disponible');

      if (respuesta === 'rechazar') {
        this.cerrarOferta(oferta, 'rechazada');
        this.ofrecerAlSiguiente(cupo);
        this.reofertarDisponibles();
        return this.detalleOferta(oferta);
      }

      const ahora = iso(this.reloj());
      this.cerrarOferta(oferta, 'aceptada');
      const cita: Cita = {
        id: this.nuevoId('cita'),
        pacienteId: oferta.pacienteId,
        profesionalId: cupo.profesionalId,
        especialidadId: cupo.especialidadId,
        consultorioId: cupo.consultorioId,
        fechaHora: cupo.fechaHora,
        duracionMin: cupo.duracionMin,
        estado: 'confirmada',
        origen: 'cupo_recuperado',
        cupoOrigenId: cupo.id,
        creadaEn: ahora,
        canceladaEn: null,
      };
      this.db.citas.push(cita);
      this.transicionar('cupo', cupo, 'asignado');
      cupo.citaAsignadaId = cita.id;

      const solicitud = this.db.solicitudes.find(
        (s) =>
          s.pacienteId === oferta.pacienteId &&
          s.especialidadId === cupo.especialidadId &&
          s.estado === 'activa',
      );
      if (solicitud) {
        this.transicionar('solicitud', solicitud, 'atendida');
        solicitud.cerradaEn = ahora;
      }

      const especialidad = this.buscar(this.db.especialidades, cupo.especialidadId);
      this.notificar(
        oferta.pacienteId,
        'cita_confirmada',
        'Cita confirmada',
        `Tu cita de ${especialidad.nombre} del ${formatearFechaHora(cupo.fechaHora)} quedó confirmada. La encuentras en Mis citas.`,
        oferta.id,
      );
      this.reofertarDisponibles();
      return this.detalleOferta(oferta);
    });
  }

  // ═════════════ Paciente: citas ═════════════

  listarCitas(actorId: string | null): Promise<CitaDetalle[]> {
    return this.peticion(() => {
      const paciente = this.paciente(actorId);
      return this.db.citas
        .filter((c) => c.pacienteId === paciente.id)
        .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora))
        .map((c) => this.detalleCita(c));
    });
  }

  cancelarCita(actorId: string | null, citaId: string): Promise<CitaDetalle> {
    return this.peticion(() => {
      const paciente = this.paciente(actorId);
      const cita = this.db.citas.find((c) => c.id === citaId && c.pacienteId === paciente.id);
      if (!cita) throw new ServiceError('no_encontrado');
      this.cancelarCitaInterna(cita, 'paciente');
      return this.detalleCita(cita);
    });
  }

  // ═════════════ Notificaciones ═════════════

  listarNotificaciones(actorId: string | null): Promise<Notificacion[]> {
    return this.peticion(() => {
      const actor = this.actor(actorId);
      // Invertir antes de ordenar: con la misma hora, la última creada va primero.
      return this.db.notificaciones
        .filter((n) => n.usuarioId === actor.id)
        .reverse()
        .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));
    });
  }

  contarNoLeidas(actorId: string | null): Promise<number> {
    return this.peticion(() => {
      const actor = this.actor(actorId);
      return this.db.notificaciones.filter((n) => n.usuarioId === actor.id && !n.leida).length;
    });
  }

  marcarLeida(actorId: string | null, notificacionId: string): Promise<Notificacion> {
    return this.peticion(() => {
      const actor = this.actor(actorId);
      const notificacion = this.db.notificaciones.find(
        (n) => n.id === notificacionId && n.usuarioId === actor.id,
      );
      if (!notificacion) throw new ServiceError('no_encontrado');
      notificacion.leida = true;
      return notificacion;
    });
  }

  marcarTodasLeidas(actorId: string | null): Promise<number> {
    return this.peticion(() => {
      const actor = this.actor(actorId);
      const pendientes = this.db.notificaciones.filter((n) => n.usuarioId === actor.id && !n.leida);
      pendientes.forEach((n) => {
        n.leida = true;
      });
      return pendientes.length;
    });
  }

  // ═════════════ Staff: panel ═════════════

  obtenerMetricas(actorId: string | null): Promise<MetricasPanel> {
    return this.peticion(() => {
      const { consultorioId } = this.staff(actorId);
      const desde = iso(new Date(this.reloj().getTime() - PERIODO_METRICAS_DIAS * MS_DIA));
      const citas = this.db.citas.filter((c) => c.consultorioId === consultorioId);
      const cupos = this.db.cupos.filter(
        (c) => c.consultorioId === consultorioId && c.creadoEn >= desde,
      );
      const cuposDelConsultorio = new Set(
        this.db.cupos.filter((c) => c.consultorioId === consultorioId).map((c) => c.id),
      );
      const recuperados = cupos.filter((c) => c.estado === 'asignado').length;
      return {
        consultorio: this.buscar(this.db.consultorios, consultorioId),
        periodoDias: PERIODO_METRICAS_DIAS,
        cancelaciones: citas.filter(
          (c) => c.estado === 'cancelada' && c.canceladaEn !== null && c.canceladaEn >= desde,
        ).length,
        inasistencias: citas.filter((c) => c.estado === 'inasistencia' && c.fechaHora >= desde)
          .length,
        cuposLiberados: cupos.length,
        cuposRecuperados: recuperados,
        tasaRecuperacion: cupos.length === 0 ? 0 : recuperados / cupos.length,
        ofertasPendientes: this.db.ofertas.filter(
          (o) => o.estado === 'pendiente' && cuposDelConsultorio.has(o.cupoId),
        ).length,
      };
    });
  }

  listarAgenda(
    actorId: string | null,
    rango: RangoAgenda = { desdeDias: 0, hastaDias: 7 },
  ): Promise<CitaAgenda[]> {
    return this.peticion(() => {
      const { consultorioId } = this.staff(actorId);
      const hoy = inicioDelDia(this.reloj()).getTime();
      const desde = iso(new Date(hoy + rango.desdeDias * MS_DIA));
      const hasta = iso(new Date(hoy + (rango.hastaDias + 1) * MS_DIA));
      return this.db.citas
        .filter(
          (c) => c.consultorioId === consultorioId && c.fechaHora >= desde && c.fechaHora < hasta,
        )
        .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora))
        .map((c) => this.citaAgenda(c));
    });
  }

  registrarCancelacion(actorId: string | null, citaId: string): Promise<CitaAgenda> {
    return this.peticion(() => {
      const cita = this.citaDelConsultorio(actorId, citaId);
      this.cancelarCitaInterna(cita, 'staff');
      return this.citaAgenda(cita);
    });
  }

  registrarInasistencia(actorId: string | null, citaId: string): Promise<CitaAgenda> {
    return this.peticion(() => {
      const cita = this.citaDelConsultorio(actorId, citaId);
      if (new Date(cita.fechaHora) > this.reloj()) throw new ServiceError('cita_no_comenzo');
      this.transicionar('cita', cita, 'inasistencia');
      return this.citaAgenda(cita);
    });
  }

  listarCupos(actorId: string | null): Promise<CupoDetalle[]> {
    return this.peticion(() => {
      const { consultorioId } = this.staff(actorId);
      return this.db.cupos
        .filter((c) => c.consultorioId === consultorioId)
        .sort((a, b) => {
          const terminalA = esEstadoTerminal('cupo', a.estado);
          const terminalB = esEstadoTerminal('cupo', b.estado);
          if (terminalA !== terminalB) return terminalA ? 1 : -1;
          return terminalA
            ? b.creadoEn.localeCompare(a.creadoEn)
            : a.fechaHora.localeCompare(b.fechaHora);
        })
        .map((c) => this.detalleCupo(c));
    });
  }

  obtenerCupo(actorId: string | null, cupoId: string): Promise<CupoConLineaDeTiempo> {
    return this.peticion(() => {
      const { consultorioId } = this.staff(actorId);
      const cupo = this.db.cupos.find((c) => c.id === cupoId && c.consultorioId === consultorioId);
      if (!cupo) throw new ServiceError('no_encontrado');
      const rondas = this.db.ofertas
        .filter((o) => o.cupoId === cupo.id)
        .sort((a, b) => a.ronda - b.ronda)
        .map((o) => ({
          ofertaId: o.id,
          ronda: o.ronda,
          paciente: this.referenciaPaciente(o.pacienteId),
          estado: o.estado,
          creadaEn: o.creadaEn,
          expiraEn: o.expiraEn,
          respondidaEn: o.respondidaEn,
        }));
      return { ...this.detalleCupo(cupo), rondas };
    });
  }

  listarOfertasEnCurso(actorId: string | null): Promise<OfertaEnCurso[]> {
    return this.peticion(() => {
      const { consultorioId } = this.staff(actorId);
      return this.db.ofertas
        .filter((o) => o.estado === 'pendiente')
        .map((o) => ({ oferta: o, cupo: this.buscar(this.db.cupos, o.cupoId) }))
        .filter(({ cupo }) => cupo.consultorioId === consultorioId)
        .sort((a, b) => a.oferta.expiraEn.localeCompare(b.oferta.expiraEn))
        .map(({ oferta, cupo }) => ({
          ofertaId: oferta.id,
          cupoId: cupo.id,
          ronda: oferta.ronda,
          paciente: this.referenciaPaciente(oferta.pacienteId),
          especialidad: this.buscar(this.db.especialidades, cupo.especialidadId),
          profesional: this.buscar(this.db.profesionales, cupo.profesionalId),
          fechaHora: cupo.fechaHora,
          expiraEn: oferta.expiraEn,
        }));
    });
  }

  // ═════════════ Motor ("backend") ═════════════

  /**
   * "Cron" del backend: cierra los cupos a los que ya no llega nadie, vence las
   * ofertas sin respuesta y ofrece cada cupo al siguiente candidato.
   * @returns número de cupos u ofertas que cambiaron de estado.
   */
  expirarOfertas(): number {
    let cambios = 0;
    for (const cupo of [...this.db.cupos]) {
      if (
        !esEstadoTerminal('cupo', cupo.estado) &&
        this.minutosHasta(cupo.fechaHora) < MARGEN_CIERRE_CUPO_MIN
      ) {
        this.cerrarCupo(cupo);
        cambios += 1;
      }
    }
    const ahora = this.reloj();
    const vencidas = this.db.ofertas.filter(
      (o) => o.estado === 'pendiente' && new Date(o.expiraEn) <= ahora,
    );
    for (const oferta of vencidas) {
      this.cerrarOferta(oferta, 'expirada');
      const cupo = this.buscar(this.db.cupos, oferta.cupoId);
      this.notificar(
        oferta.pacienteId,
        'oferta_expirada',
        'Una oferta expiró',
        `No alcanzaste a responder el cupo de ${this.buscar(this.db.especialidades, cupo.especialidadId).nombre}. Te avisaremos del próximo.`,
        oferta.id,
      );
      this.ofrecerAlSiguiente(cupo);
      cambios += 1;
    }
    if (vencidas.length > 0) this.reofertarDisponibles();
    return cambios;
  }

  private cancelarCitaInterna(cita: Cita, por: CanceladaPor): CupoLiberado | null {
    if (!puedeTransicionar('cita', cita.estado, 'cancelada')) {
      throw new ServiceError('transicion_invalida', `La cita ya está ${cita.estado}`);
    }
    if (new Date(cita.fechaHora) <= this.reloj()) throw new ServiceError('cita_ya_comenzo');

    cita.estado = 'cancelada';
    cita.canceladaEn = iso(this.reloj());
    if (por === 'staff') {
      const especialidad = this.buscar(this.db.especialidades, cita.especialidadId);
      this.notificar(
        cita.pacienteId,
        'cita_cancelada',
        'Tu cita fue cancelada',
        `${CANCELADA_POR.staff}: ${especialidad.nombre}, ${formatearFechaHora(cita.fechaHora)}. Si aún la necesitas, únete a la lista de espera.`,
      );
    }
    return this.liberarCupo(cita, por);
  }

  /** Idempotente: una cita libera como máximo UN cupo (índice único en la Fase 3). */
  private liberarCupo(cita: Cita, por: CanceladaPor): CupoLiberado | null {
    const existente = this.db.cupos.find((c) => c.citaOrigenId === cita.id);
    if (existente) return existente;
    // Sin margen suficiente nadie alcanzaría a llegar: no se libera un cupo ofertable.
    if (this.minutosHasta(cita.fechaHora) < MARGEN_CIERRE_CUPO_MIN) return null;

    const cupo: CupoLiberado = {
      id: this.nuevoId('cupo'),
      citaOrigenId: cita.id,
      consultorioId: cita.consultorioId,
      profesionalId: cita.profesionalId,
      especialidadId: cita.especialidadId,
      fechaHora: cita.fechaHora,
      duracionMin: cita.duracionMin,
      estado: 'disponible',
      canceladaPor: por,
      rondaActual: 0,
      citaAsignadaId: null,
      creadoEn: iso(this.reloj()),
    };
    this.db.cupos.push(cupo);
    this.ofrecerAlSiguiente(cupo);
    return cupo;
  }

  /** Ofrece el cupo al mejor candidato; si no hay, queda `disponible` esperando. */
  private ofrecerAlSiguiente(cupo: CupoLiberado): void {
    if (esEstadoTerminal('cupo', cupo.estado)) return;
    if (this.minutosHasta(cupo.fechaHora) < MARGEN_CIERRE_CUPO_MIN) {
      this.cerrarCupo(cupo);
      return;
    }

    const ahora = this.reloj();
    const citaOrigen = this.buscar(this.db.citas, cupo.citaOrigenId);
    const [elegido] = evaluarCandidatos({
      cupo,
      especialidad: this.buscar(this.db.especialidades, cupo.especialidadId),
      consultorio: this.buscar(this.db.consultorios, cupo.consultorioId),
      pacienteOrigenId: citaOrigen.pacienteId,
      pacientes: this.db.perfiles,
      preferencias: this.db.preferencias,
      solicitudes: this.db.solicitudes,
      citas: this.db.citas,
      ofertas: this.db.ofertas,
      ahora,
    });

    if (!elegido) {
      if (cupo.estado === 'ofertando') this.transicionar('cupo', cupo, 'disponible');
      return;
    }

    if (cupo.estado === 'disponible') this.transicionar('cupo', cupo, 'ofertando');
    cupo.rondaActual += 1;
    const limite = Math.min(
      ahora.getTime() + DURACION_OFERTA_MIN * MS_MIN,
      new Date(cupo.fechaHora).getTime() - MARGEN_CIERRE_CUPO_MIN * MS_MIN,
    );
    const oferta: Oferta = {
      id: this.nuevoId('oferta'),
      cupoId: cupo.id,
      pacienteId: elegido.pacienteId,
      ronda: cupo.rondaActual,
      estado: 'pendiente',
      creadaEn: iso(ahora),
      expiraEn: iso(new Date(limite)),
      respondidaEn: null,
      explicacion: elegido.explicacion,
    };
    this.db.ofertas.push(oferta);
    this.registrarEvento(oferta, 'creada');

    const especialidad = this.buscar(this.db.especialidades, cupo.especialidadId);
    const consultorio = this.buscar(this.db.consultorios, cupo.consultorioId);
    const minutos = Math.max(Math.round((limite - ahora.getTime()) / MS_MIN), 1);
    this.notificar(
      oferta.pacienteId,
      'oferta_nueva',
      'Nuevo cupo disponible',
      `Se liberó un cupo de ${especialidad.nombre} el ${formatearFechaHora(cupo.fechaHora)} en ${consultorio.nombre}. Tienes ${minutos} minutos para responder.`,
      oferta.id,
    );
  }

  /** Cupos sin candidato: vuelven a intentarlo cuando cambian solicitudes o preferencias. */
  private reofertarDisponibles(): void {
    for (const cupo of this.db.cupos.filter((c) => c.estado === 'disponible')) {
      this.ofrecerAlSiguiente(cupo);
    }
  }

  /** Llegó la hora del cupo sin asignarse: se cancelan sus ofertas y expira. */
  private cerrarCupo(cupo: CupoLiberado): void {
    for (const oferta of this.db.ofertas) {
      if (oferta.cupoId === cupo.id && oferta.estado === 'pendiente') {
        this.cerrarOferta(oferta, 'cancelada');
      }
    }
    this.transicionar('cupo', cupo, 'expirado');
  }

  private cerrarOferta(
    oferta: Oferta,
    estado: 'aceptada' | 'rechazada' | 'expirada' | 'cancelada',
  ) {
    this.transicionar('oferta', oferta, estado);
    if (estado === 'aceptada' || estado === 'rechazada') oferta.respondidaEn = iso(this.reloj());
    this.registrarEvento(oferta, estado);
  }

  // ═════════════ Utilidades internas ═════════════

  /** Envoltorio de toda petición: red simulada, "cron" y copia del resultado. */
  private async peticion<T>(operacion: () => T): Promise<T> {
    const { min, max } = this.config.latenciaMs;
    const espera = min + Math.round(this.aleatorio() * Math.max(max - min, 0));
    if (espera > 0) await new Promise((resolver) => setTimeout(resolver, espera));

    const falla =
      this.config.fallos === 'siempre' ||
      (this.config.fallos === 'intermitente' && this.aleatorio() < PROBABILIDAD_FALLO_INTERMITENTE);
    if (falla) throw new ServiceError('sin_conexion', 'Fallo de red simulado');

    this.expirarOfertas();
    return clonar(operacion());
  }

  private transicionar<M extends Maquina>(
    maquina: M,
    entidad: { estado: EstadosPorMaquina[M] },
    hacia: EstadosPorMaquina[M],
  ): void {
    if (!puedeTransicionar(maquina, entidad.estado, hacia)) {
      throw new ServiceError('transicion_invalida', `${maquina}: ${entidad.estado} → ${hacia}`);
    }
    entidad.estado = hacia;
  }

  private nuevoId(prefijo: string): string {
    this.secuencia += 1;
    return `${prefijo}-${this.secuencia.toString().padStart(4, '0')}`;
  }

  private minutosHasta(fecha: string): number {
    return (new Date(fecha).getTime() - this.reloj().getTime()) / MS_MIN;
  }

  private buscar<T extends { id: string }>(coleccion: readonly T[], id: string): T {
    const elemento = coleccion.find((e) => e.id === id);
    if (!elemento) throw new ServiceError('no_encontrado', `No existe ${id}`);
    return elemento;
  }

  private actor(actorId: string | null): Perfil {
    const perfil = actorId ? this.db.perfiles.find((p) => p.id === actorId) : undefined;
    if (!perfil) throw new ServiceError('no_autenticado');
    return perfil;
  }

  private paciente(actorId: string | null): Perfil {
    const perfil = this.actor(actorId);
    if (perfil.rol !== 'paciente') throw new ServiceError('prohibido');
    return perfil;
  }

  private staff(actorId: string | null): Perfil & { consultorioId: string } {
    const perfil = this.actor(actorId);
    if (perfil.rol !== 'staff' || !perfil.consultorioId) throw new ServiceError('prohibido');
    return { ...perfil, consultorioId: perfil.consultorioId };
  }

  private preferenciasDe(pacienteId: string): PreferenciasPaciente {
    const preferencias = this.db.preferencias.get(pacienteId);
    if (!preferencias) throw new ServiceError('no_encontrado');
    return preferencias;
  }

  private ofertasPendientesDe(pacienteId: string): Oferta[] {
    return this.db.ofertas.filter((o) => o.pacienteId === pacienteId && o.estado === 'pendiente');
  }

  private ofertaPropia(actorId: string | null, ofertaId: string): Oferta {
    const paciente = this.paciente(actorId);
    const oferta = this.db.ofertas.find((o) => o.id === ofertaId && o.pacienteId === paciente.id);
    if (!oferta) throw new ServiceError('no_encontrado');
    return oferta;
  }

  private citaDelConsultorio(actorId: string | null, citaId: string): Cita {
    const { consultorioId } = this.staff(actorId);
    const cita = this.db.citas.find((c) => c.id === citaId && c.consultorioId === consultorioId);
    if (!cita) throw new ServiceError('no_encontrado');
    return cita;
  }

  private contexto(datos: {
    especialidadId: string;
    profesionalId: string;
    consultorioId: string;
  }) {
    return {
      especialidad: this.buscar(this.db.especialidades, datos.especialidadId),
      profesional: this.buscar(this.db.profesionales, datos.profesionalId),
      consultorio: this.buscar(this.db.consultorios, datos.consultorioId),
    };
  }

  private detalleOferta(oferta: Oferta): OfertaDetalle {
    const cupo = this.buscar(this.db.cupos, oferta.cupoId);
    return {
      ...oferta,
      ...this.contexto(cupo),
      fechaHora: cupo.fechaHora,
      duracionMin: cupo.duracionMin,
    };
  }

  private detalleCita(cita: Cita): CitaDetalle {
    return { ...cita, ...this.contexto(cita) };
  }

  private detalleCupo(cupo: CupoLiberado): CupoDetalle {
    const vigente = this.db.ofertas.find((o) => o.cupoId === cupo.id && o.estado === 'pendiente');
    return {
      ...cupo,
      ...this.contexto(cupo),
      ofertaVigente: vigente
        ? { id: vigente.id, ronda: vigente.ronda, expiraEn: vigente.expiraEn }
        : null,
    };
  }

  private citaAgenda(cita: Cita): CitaAgenda {
    const activa = ESTADOS_CITA_ACTIVOS.includes(cita.estado);
    return {
      ...this.detalleCita(cita),
      paciente: this.referenciaPaciente(cita.pacienteId),
      riesgo: activa
        ? estimarRiesgoFicticio(
            cita,
            this.db.citas.filter((c) => c.pacienteId === cita.pacienteId),
            this.reloj(),
          )
        : null,
    };
  }

  /** El staff solo recibe iniciales y un código: ni nombre, ni correo, ni teléfono. */
  private referenciaPaciente(pacienteId: string): ReferenciaPaciente {
    const perfil = this.buscar(this.db.perfiles, pacienteId);
    return { codigo: codigoPaciente(perfil.id), iniciales: obtenerIniciales(perfil.nombre) };
  }

  private registrarEvento(oferta: Oferta, tipo: TipoEventoOferta): void {
    this.db.eventos.push({
      id: this.nuevoId('ev'),
      ofertaId: oferta.id,
      cupoId: oferta.cupoId,
      tipo,
      ronda: oferta.ronda,
      fecha: iso(this.reloj()),
    });
  }

  private notificar(
    usuarioId: string,
    tipo: TipoNotificacion,
    titulo: string,
    cuerpo: string,
    ofertaId: string | null = null,
  ): void {
    this.db.notificaciones.push({
      id: this.nuevoId('notif'),
      usuarioId,
      tipo,
      titulo,
      cuerpo,
      ofertaId,
      leida: false,
      creadaEn: iso(this.reloj()),
    });
  }
}
