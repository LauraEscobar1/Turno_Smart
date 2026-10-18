import { Header, Screen } from '@/components/layout';
import { ContenidoConsulta } from '@/components/ui';
import { ListaCitas } from '@/features/citas/components/ListaCitas';
import { useCitas } from '@/features/citas/hooks/useCitas';
import { useRefrescoManual } from '@/hooks/useRefrescoManual';

export default function Citas() {
  const citas = useCitas();
  const refresco = useRefrescoManual(citas.refetch);

  return (
    <Screen scroll refreshControl={refresco}>
      <Header title="Mis citas" subtitle="Tus próximas citas y el historial de atenciones." />
      <ContenidoConsulta consulta={citas} mensajeCarga="Cargando tus citas…">
        {(datos) => <ListaCitas citas={datos} />}
      </ContenidoConsulta>
    </Screen>
  );
}
