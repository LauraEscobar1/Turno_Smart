import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { spacing } from '@/theme';
import type { MetricasPanel as Metricas } from '@/types';
import { formatearPorcentaje } from '@/utils/numeros';

import { MetricaCard } from './MetricaCard';

export function MetricasPanel({ metricas }: { metricas: Metricas }) {
  return (
    <View style={styles.contenedor}>
      <AppText color="textSecondary">
        {metricas.consultorio.nombre} · últimos {metricas.periodoDias} días
      </AppText>
      <View style={styles.cuadricula}>
        <MetricaCard
          icono="close-circle-outline"
          etiqueta="Cancelaciones"
          valor={String(metricas.cancelaciones)}
        />
        <MetricaCard
          icono="calendar-clear-outline"
          etiqueta="Cupos liberados"
          valor={String(metricas.cuposLiberados)}
        />
        <MetricaCard
          icono="checkmark-circle-outline"
          etiqueta="Cupos recuperados"
          valor={String(metricas.cuposRecuperados)}
        />
        <MetricaCard
          icono="trending-up-outline"
          etiqueta="Tasa de recuperación"
          valor={formatearPorcentaje(metricas.tasaRecuperacion)}
        />
        <MetricaCard
          icono="paper-plane-outline"
          etiqueta="Ofertas pendientes"
          valor={String(metricas.ofertasPendientes)}
        />
        <MetricaCard
          icono="person-remove-outline"
          etiqueta="Inasistencias"
          valor={String(metricas.inasistencias)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: spacing.md,
  },
  cuadricula: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
