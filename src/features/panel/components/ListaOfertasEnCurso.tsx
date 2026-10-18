import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, EmptyState } from '@/components/ui';
import { useCuentaRegresiva } from '@/features/ofertas/hooks/useCuentaRegresiva';
import { IndicadorTiempo } from '@/features/ofertas/components/IndicadorTiempo';
import { spacing } from '@/theme';
import type { OfertaEnCurso } from '@/types';
import { formatearFechaHora } from '@/utils/fechas';

export function ListaOfertasEnCurso({ ofertas }: { ofertas: OfertaEnCurso[] }) {
  if (ofertas.length === 0) {
    return (
      <EmptyState
        icon="paper-plane-outline"
        title="No hay ofertas en curso"
        description="Cuando un cupo liberado se ofrezca a un paciente, verás aquí cuánto tiempo le queda para responder."
      />
    );
  }
  return (
    <View style={styles.lista}>
      {ofertas.map((oferta) => (
        <TarjetaOferta key={oferta.ofertaId} oferta={oferta} />
      ))}
    </View>
  );
}

function TarjetaOferta({ oferta }: { oferta: OfertaEnCurso }) {
  const tiempo = useCuentaRegresiva(oferta.expiraEn);
  return (
    <Card
      onPress={() =>
        router.push({ pathname: '/(staff)/cupos/[id]', params: { id: oferta.cupoId } })
      }
      accessibilityLabel={`${oferta.especialidad.nombre}, ${formatearFechaHora(oferta.fechaHora)}. Ofrecida en ronda ${oferta.ronda} al paciente ${oferta.paciente.iniciales}`}
      accessibilityHint="Abre la línea de tiempo del cupo"
    >
      <AppText variant="subtitle">{oferta.especialidad.nombre}</AppText>
      <AppText color="textSecondary">
        {oferta.profesional.nombre} · {formatearFechaHora(oferta.fechaHora)}
      </AppText>
      <AppText variant="caption" color="textSecondary">
        Ronda {oferta.ronda} · paciente {oferta.paciente.iniciales} ({oferta.paciente.codigo})
      </AppText>
      <IndicadorTiempo tiempo={tiempo} />
    </Card>
  );
}

const styles = StyleSheet.create({
  lista: {
    gap: spacing.md,
  },
});
