import {
  esEstadoTerminal,
  puedeTransicionar,
  TRANSICIONES_CITA,
  TRANSICIONES_CUPO,
  TRANSICIONES_OFERTA,
  TRANSICIONES_SOLICITUD,
} from '@/constants/estados';
import {
  ESTADOS_CITA_VALORES,
  ESTADOS_CUPO_VALORES,
  ESTADOS_OFERTA_VALORES,
  ESTADOS_SOLICITUD_VALORES,
} from '@/types';

describe('máquinas de estado', () => {
  it('cada máquina define transiciones para todos sus estados', () => {
    expect(Object.keys(TRANSICIONES_OFERTA).sort()).toEqual([...ESTADOS_OFERTA_VALORES].sort());
    expect(Object.keys(TRANSICIONES_CITA).sort()).toEqual([...ESTADOS_CITA_VALORES].sort());
    expect(Object.keys(TRANSICIONES_CUPO).sort()).toEqual([...ESTADOS_CUPO_VALORES].sort());
    expect(Object.keys(TRANSICIONES_SOLICITUD).sort()).toEqual(
      [...ESTADOS_SOLICITUD_VALORES].sort(),
    );
  });

  describe('oferta', () => {
    it.each(['aceptada', 'rechazada', 'expirada', 'cancelada'] as const)(
      'pendiente → %s es válida',
      (destino) => {
        expect(puedeTransicionar('oferta', 'pendiente', destino)).toBe(true);
      },
    );

    it('una oferta respondida no cambia más (no se puede aceptar una expirada)', () => {
      expect(puedeTransicionar('oferta', 'expirada', 'aceptada')).toBe(false);
      expect(puedeTransicionar('oferta', 'rechazada', 'aceptada')).toBe(false);
      expect(puedeTransicionar('oferta', 'aceptada', 'rechazada')).toBe(false);
      for (const estado of ['aceptada', 'rechazada', 'expirada', 'cancelada'] as const) {
        expect(esEstadoTerminal('oferta', estado)).toBe(true);
      }
    });
  });

  describe('cita', () => {
    it('programada y confirmada pueden cancelarse', () => {
      expect(puedeTransicionar('cita', 'programada', 'cancelada')).toBe(true);
      expect(puedeTransicionar('cita', 'confirmada', 'cancelada')).toBe(true);
    });

    it('una cita cancelada no se puede volver a cancelar ni marcar como asistida', () => {
      expect(puedeTransicionar('cita', 'cancelada', 'cancelada')).toBe(false);
      expect(puedeTransicionar('cita', 'cancelada', 'asistida')).toBe(false);
    });

    it('una cita confirmada no vuelve a programada', () => {
      expect(puedeTransicionar('cita', 'confirmada', 'programada')).toBe(false);
    });
  });

  describe('cupo', () => {
    it('sigue el ciclo disponible → ofertando → asignado', () => {
      expect(puedeTransicionar('cupo', 'disponible', 'ofertando')).toBe(true);
      expect(puedeTransicionar('cupo', 'ofertando', 'asignado')).toBe(true);
    });

    it('vuelve a disponible si se agotan los candidatos', () => {
      expect(puedeTransicionar('cupo', 'ofertando', 'disponible')).toBe(true);
    });

    it('no se asigna sin haberse ofertado, ni se reabre un cupo asignado o expirado', () => {
      expect(puedeTransicionar('cupo', 'disponible', 'asignado')).toBe(false);
      expect(esEstadoTerminal('cupo', 'asignado')).toBe(true);
      expect(esEstadoTerminal('cupo', 'expirado')).toBe(true);
    });
  });

  describe('solicitud', () => {
    it('solo una solicitud activa puede cerrarse', () => {
      expect(puedeTransicionar('solicitud', 'activa', 'atendida')).toBe(true);
      expect(puedeTransicionar('solicitud', 'activa', 'cancelada')).toBe(true);
      expect(puedeTransicionar('solicitud', 'cancelada', 'activa')).toBe(false);
      expect(puedeTransicionar('solicitud', 'atendida', 'cancelada')).toBe(false);
    });
  });
});
