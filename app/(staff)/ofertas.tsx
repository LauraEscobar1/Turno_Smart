import { Header, Screen } from '@/components/layout';
import { ContenidoConsulta } from '@/components/ui';
import { ListaOfertasEnCurso } from '@/features/panel/components/ListaOfertasEnCurso';
import { useOfertasEnCurso } from '@/features/panel/hooks/usePanel';
import { useRefrescoManual } from '@/hooks/useRefrescoManual';

export default function OfertasEnCurso() {
  const ofertas = useOfertasEnCurso();
  const refresco = useRefrescoManual(ofertas.refetch);

  return (
    <Screen scroll refreshControl={refresco}>
      <Header title="Ofertas en curso" subtitle="Pacientes que tienen un cupo por responder." />
      <ContenidoConsulta consulta={ofertas} mensajeCarga="Cargando ofertas…">
        {(datos) => <ListaOfertasEnCurso ofertas={datos} />}
      </ContenidoConsulta>
    </Screen>
  );
}
