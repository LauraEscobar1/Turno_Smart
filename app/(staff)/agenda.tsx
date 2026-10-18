import { Header, Screen } from '@/components/layout';
import { ContenidoConsulta, Notice } from '@/components/ui';
import { AgendaStaff } from '@/features/panel/components/AgendaStaff';
import { useAgenda } from '@/features/panel/hooks/usePanel';
import { useRefrescoManual } from '@/hooks/useRefrescoManual';

export default function Agenda() {
  const agenda = useAgenda();
  const refresco = useRefrescoManual(agenda.refetch);

  return (
    <Screen scroll refreshControl={refresco}>
      <Header title="Agenda" subtitle="Hoy y los próximos 7 días." />
      <Notice
        tone="info"
        title="Riesgo de inasistencia: estimación ficticia"
        message="Es una regla de demostración; la IA llega en la Fase 5. La decisión siempre es del staff."
      />
      <ContenidoConsulta consulta={agenda} mensajeCarga="Cargando la agenda…">
        {(datos) => <AgendaStaff citas={datos} />}
      </ContenidoConsulta>
    </Screen>
  );
}
