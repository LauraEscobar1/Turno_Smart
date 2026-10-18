import { Header, Screen } from '@/components/layout';
import { ContenidoConsulta } from '@/components/ui';
import { ListaCupos } from '@/features/panel/components/ListaCupos';
import { useCupos } from '@/features/panel/hooks/usePanel';
import { useRefrescoManual } from '@/hooks/useRefrescoManual';

export default function Cupos() {
  const cupos = useCupos();
  const refresco = useRefrescoManual(cupos.refetch);

  return (
    <Screen scroll refreshControl={refresco}>
      <Header
        title="Cupos liberados"
        subtitle="Citas canceladas que se están ofreciendo a la lista de espera."
      />
      <ContenidoConsulta consulta={cupos} mensajeCarga="Cargando cupos…">
        {(datos) => <ListaCupos cupos={datos} />}
      </ContenidoConsulta>
    </Screen>
  );
}
