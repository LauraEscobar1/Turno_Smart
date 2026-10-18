import { StyleSheet, View } from 'react-native';

import { AppText, Badge, Card, ContenidoConsulta, Divider, EmptyState } from '@/components/ui';
import { CANCELADA_POR, ESTADOS_CUPO, ESTADOS_OFERTA } from '@/constants/estados';
import { colors, radius, spacing } from '@/theme';
import type { CupoConLineaDeTiempo, RondaOferta } from '@/types';
import { formatearFechaHora, formatearHora } from '@/utils/fechas';

import { useCupo } from '../hooks/usePanel';

export function DetalleCupo({ id }: { id: string }) {
  const consulta = useCupo(id);
  return (
    <ContenidoConsulta consulta={consulta} mensajeCarga="Cargando el cupo…">
      {(cupo) => <DetalleCargado cupo={cupo} />}
    </ContenidoConsulta>
  );
}

function DetalleCargado({ cupo }: { cupo: CupoConLineaDeTiempo }) {
  return (
    <View style={styles.contenedor}>
      <Card>
        <View style={styles.cabecera}>
          <AppText variant="title" style={styles.flex}>
            {cupo.especialidad.nombre}
          </AppText>
          <Badge {...ESTADOS_CUPO[cupo.estado]} />
        </View>
        <AppText color="textSecondary">{cupo.profesional.nombre}</AppText>
        <AppText variant="bodyStrong">{formatearFechaHora(cupo.fechaHora)}</AppText>
        <AppText variant="caption" color="textSecondary">
          {CANCELADA_POR[cupo.canceladaPor]} · liberado el {formatearFechaHora(cupo.creadoEn)}
        </AppText>
      </Card>

      <AppText variant="subtitle" accessibilityRole="header">
        Línea de tiempo de ofertas
      </AppText>
      <AppText variant="caption" color="textSecondary">
        Por privacidad, cada paciente aparece solo con sus iniciales y un código.
      </AppText>
      {cupo.rondas.length === 0 ? (
        <EmptyState
          icon="hourglass-outline"
          title="Aún no se ha ofrecido"
          description="No hay pacientes compatibles en este momento. Se ofrecerá en cuanto alguien se una a la lista."
        />
      ) : (
        <Card>
          {cupo.rondas.map((ronda, i) => (
            <View key={ronda.ofertaId}>
              {i > 0 ? <Divider spacingY="sm" /> : null}
              <EventoRonda ronda={ronda} />
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

function EventoRonda({ ronda }: { ronda: RondaOferta }) {
  const estado = ESTADOS_OFERTA[ronda.estado];
  const tono = colors.tones[estado.tone];
  const cierre = ronda.respondidaEn
    ? `respondió a las ${formatearHora(ronda.respondidaEn)}`
    : ronda.estado === 'pendiente'
      ? `vence a las ${formatearHora(ronda.expiraEn)}`
      : `venció a las ${formatearHora(ronda.expiraEn)}`;
  return (
    <View
      style={styles.ronda}
      accessible
      accessibilityLabel={`Ronda ${ronda.ronda}: paciente ${ronda.paciente.iniciales}, código ${ronda.paciente.codigo}. ${estado.label}. Ofrecida a las ${formatearHora(ronda.creadaEn)}, ${cierre}.`}
    >
      <View style={[styles.marcador, { backgroundColor: tono.soft }]}>
        <AppText variant="label" style={{ color: tono.onSoft }}>
          {ronda.ronda}
        </AppText>
      </View>
      <View style={styles.flex}>
        <View style={styles.cabecera}>
          <AppText variant="bodyStrong" style={styles.flex}>
            {ronda.paciente.iniciales} · {ronda.paciente.codigo}
          </AppText>
          <Badge {...estado} />
        </View>
        <AppText variant="caption" color="textSecondary">
          Ofrecida a las {formatearHora(ronda.creadaEn)} · {cierre}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: spacing.md,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  ronda: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  marcador: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
