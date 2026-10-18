import { router } from 'expo-router';

import { Header, Screen } from '@/components/layout';
import { AppText, Button, Card, ContenidoConsulta } from '@/components/ui';
import { MetricasPanel } from '@/features/panel/components/MetricasPanel';
import { useMetricas } from '@/features/panel/hooks/usePanel';
import { useRefrescoManual } from '@/hooks/useRefrescoManual';

export default function Panel() {
  const metricas = useMetricas();
  const refresco = useRefrescoManual(metricas.refetch);

  return (
    <Screen scroll refreshControl={refresco}>
      <Header title="Panel del consultorio" subtitle="Cancelaciones y cupos recuperados." />
      <ContenidoConsulta consulta={metricas} mensajeCarga="Calculando métricas…">
        {(datos) => <MetricasPanel metricas={datos} />}
      </ContenidoConsulta>
      <Card>
        <AppText variant="subtitle" accessibilityRole="header">
          Riesgo de inasistencia
        </AppText>
        <AppText color="textSecondary">
          Cada cita de la agenda muestra un riesgo estimado con su explicación y una recomendación.
          En esta fase es una estimación ficticia; la IA llega en la Fase 5.
        </AppText>
        <Button
          title="Ver agenda"
          variant="secondary"
          onPress={() => router.navigate('/(staff)/agenda')}
        />
      </Card>
    </Screen>
  );
}
