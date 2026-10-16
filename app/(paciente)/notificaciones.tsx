import { Header, Screen } from '@/components/layout';
import { EmptyState } from '@/components/ui';

export default function Notificaciones() {
  return (
    <Screen scroll>
      <Header title="Notificaciones" subtitle="Avisos de cupos de último minuto y recordatorios." />
      <EmptyState
        icon="notifications-outline"
        title="Sin notificaciones"
        description="Te avisaremos aquí cuando se libere un cupo compatible con tus preferencias."
      />
    </Screen>
  );
}
