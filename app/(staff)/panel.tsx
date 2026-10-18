import { StyleSheet, View } from 'react-native';

import { Header, Screen } from '@/components/layout';
import { AppText, Card, EmptyState, Notice } from '@/components/ui';
import { MetricaCard } from '@/features/panel/components/MetricaCard';
import { METRICAS_FICTICIAS } from '@/features/panel/mocks/panel.ficticio';
import { spacing } from '@/theme';
import { formatearPorcentaje } from '@/utils/numeros';

export default function Panel() {
  const metricas = METRICAS_FICTICIAS;

  return (
    <Screen scroll>
      <Header title="Panel del consultorio" subtitle="Cancelaciones y cupos recuperados." />
      <Notice
        tone="info"
        title="Datos ficticios"
        message="Métricas de ejemplo para visualizar el panel."
      />

      <View style={styles.cuadricula}>
        <MetricaCard
          icono="close-circle-outline"
          etiqueta="Cupos liberados"
          valor={String(metricas.cuposLiberados)}
        />
        <MetricaCard
          icono="checkmark-circle-outline"
          etiqueta="Cupos recuperados"
          valor={String(metricas.cuposRecuperados)}
        />
        <MetricaCard
          icono="paper-plane-outline"
          etiqueta="Ofertas en curso"
          valor={String(metricas.ofertasEnCurso)}
        />
        <MetricaCard
          icono="trending-up-outline"
          etiqueta="Tasa de recuperación"
          valor={formatearPorcentaje(metricas.tasaRecuperacion)}
        />
      </View>

      <AppText variant="subtitle" accessibilityRole="header">
        Riesgo de inasistencia
      </AppText>
      <Card>
        <EmptyState
          icon="analytics-outline"
          title="Disponible en la Fase 5"
          description="La IA estimará el riesgo de inasistencia de las próximas citas, con una explicación y una recomendación. La decisión siempre es del staff."
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cuadricula: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
