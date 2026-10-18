/**
 * Implementación de los contratos de `src/services/` sobre el servidor simulado.
 * Igual que el cliente de Supabase, guarda la sesión y la envía en cada llamada.
 */
import type { Perfil } from '@/types';

import type { AuthService, OyenteSesion } from '../auth';
import type { Servicios } from '../servicios';
import { almacenamientoAsyncStorage, type AlmacenamientoSesion } from './almacenamientoSesion';
import { CUENTAS_DEMO } from './semilla';
import { ServidorSimulado } from './servidorSimulado';

export interface OpcionesServiciosMock {
  servidor?: ServidorSimulado;
  almacenamiento?: AlmacenamientoSesion;
}

export function crearServiciosMock(opciones: OpcionesServiciosMock = {}): Servicios {
  const servidor = opciones.servidor ?? new ServidorSimulado();
  const almacenamiento = opciones.almacenamiento ?? almacenamientoAsyncStorage;

  let actorId: string | null = null;
  const oyentes = new Set<OyenteSesion>();

  const fijarSesion = async (perfil: Perfil | null) => {
    actorId = perfil?.id ?? null;
    if (perfil) await almacenamiento.guardar(perfil.id);
    else await almacenamiento.borrar();
    oyentes.forEach((oyente) => oyente(perfil));
  };

  const auth: AuthService = {
    async obtenerSesion() {
      const guardado = await almacenamiento.leer();
      if (!guardado) {
        actorId = null;
        return null;
      }
      const perfil = await servidor.obtenerPerfilPorId(guardado);
      // Las cuentas registradas viven en memoria: tras reiniciar la app ya no existen.
      if (!perfil) await almacenamiento.borrar();
      actorId = perfil?.id ?? null;
      return perfil;
    },
    async iniciarSesion(credenciales) {
      const perfil = await servidor.iniciarSesion(credenciales);
      await fijarSesion(perfil);
      return perfil;
    },
    async registrar(datos) {
      const perfil = await servidor.registrarPaciente(datos);
      await fijarSesion(perfil);
      return perfil;
    },
    async cerrarSesion() {
      await fijarSesion(null);
    },
    suscribirse(oyente) {
      oyentes.add(oyente);
      return () => {
        oyentes.delete(oyente);
      };
    },
  };

  return {
    auth,
    perfil: {
      obtenerPerfil: () => servidor.perfilActual(actorId),
    },
    especialidades: {
      listar: () => servidor.listarEspecialidades(actorId),
    },
    preferencias: {
      obtener: () => servidor.obtenerPreferencias(actorId),
      guardar: (datos) => servidor.guardarPreferencias(actorId, datos),
    },
    listaEspera: {
      listarSolicitudes: () => servidor.listarSolicitudes(actorId),
      unirse: (especialidadId) => servidor.unirseALista(actorId, especialidadId),
      salir: (solicitudId) => servidor.salirDeLista(actorId, solicitudId),
    },
    ofertas: {
      listar: () => servidor.listarOfertas(actorId),
      obtener: (id) => servidor.obtenerOferta(actorId, id),
      responder: (id, respuesta) => servidor.responderOferta(actorId, id, respuesta),
    },
    citas: {
      listar: () => servidor.listarCitas(actorId),
      cancelar: (id) => servidor.cancelarCita(actorId, id),
    },
    notificaciones: {
      listar: () => servidor.listarNotificaciones(actorId),
      contarNoLeidas: () => servidor.contarNoLeidas(actorId),
      marcarLeida: (id) => servidor.marcarLeida(actorId, id),
      marcarTodasLeidas: () => servidor.marcarTodasLeidas(actorId),
    },
    panel: {
      obtenerMetricas: () => servidor.obtenerMetricas(actorId),
      listarAgenda: (rango) => servidor.listarAgenda(actorId, rango),
      registrarCancelacion: (citaId) => servidor.registrarCancelacion(actorId, citaId),
      registrarInasistencia: (citaId) => servidor.registrarInasistencia(actorId, citaId),
      listarCupos: () => servidor.listarCupos(actorId),
      obtenerCupo: (id) => servidor.obtenerCupo(actorId, id),
      listarOfertasEnCurso: () => servidor.listarOfertasEnCurso(actorId),
    },
    demo: {
      cuentas: { paciente: CUENTAS_DEMO.paciente, staff: CUENTAS_DEMO.staff },
      obtenerModoFallos: () => servidor.obtenerConfig().fallos,
      configurarFallos: (modo) => servidor.configurar({ fallos: modo }),
      configurarLatencia: (latenciaMs) => servidor.configurar({ latenciaMs }),
      restablecerDatos: async () => {
        servidor.restablecer();
      },
    },
  };
}

export { ServidorSimulado } from './servidorSimulado';
