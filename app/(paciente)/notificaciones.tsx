import { Header, Screen } from '@/components/layout';
import { ContenidoConsulta } from '@/components/ui';
import { ListaNotificaciones } from '@/features/notificaciones/components/ListaNotificaciones';
import { useNotificaciones } from '@/features/notificaciones/hooks/useNotificaciones';
import { useRefrescoManual } from '@/hooks/useRefrescoManual';

export default function Notificaciones() {
  const notificaciones = useNotificaciones();
  const refresco = useRefrescoManual(notificaciones.refetch);

  return (
    <Screen scroll refreshControl={refresco}>
      <Header title="Notificaciones" subtitle="Cupos de último minuto y novedades de tus citas." />
      <ContenidoConsulta consulta={notificaciones} mensajeCarga="Cargando notificaciones…">
        {(datos) => <ListaNotificaciones notificaciones={datos} />}
      </ContenidoConsulta>
    </Screen>
  );
}
