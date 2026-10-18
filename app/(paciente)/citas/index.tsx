import { Header, Screen } from '@/components/layout';
import { AppText, EmptyState, Notice } from '@/components/ui';
import { CitaCard } from '@/features/citas/components/CitaCard';
import { CITAS_FICTICIAS } from '@/features/citas/mocks/citas.ficticias';

export default function Citas() {
  const proximas = CITAS_FICTICIAS;

  return (
    <Screen scroll>
      <Header title="Mis citas" subtitle="Tus próximas citas y el historial de atenciones." />
      <Notice tone="info" title="Datos ficticios" message="Citas de ejemplo para el modo demo." />

      <AppText variant="subtitle" accessibilityRole="header">
        Próximas
      </AppText>
      {proximas.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No tienes citas próximas"
          description="Las citas que aceptes desde una oferta aparecerán aquí."
        />
      ) : (
        proximas.map((cita) => <CitaCard key={cita.id} cita={cita} />)
      )}

      <AppText variant="subtitle" accessibilityRole="header">
        Historial
      </AppText>
      <EmptyState
        icon="time-outline"
        title="Aún no hay historial"
        description="Aquí verás las citas completadas, canceladas o perdidas."
      />
    </Screen>
  );
}
