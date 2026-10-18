import { Screen } from '@/components/layout';
import { AppText, ContenidoConsulta } from '@/components/ui';
import { ListaOfertas } from '@/features/ofertas/components/ListaOfertas';
import { separarOfertas, useOfertas } from '@/features/ofertas/hooks/useOfertas';
import { useRefrescoManual } from '@/hooks/useRefrescoManual';

export default function HistorialOfertas() {
  const ofertas = useOfertas();
  const refresco = useRefrescoManual(ofertas.refetch);

  return (
    <Screen scroll edges={['bottom', 'left', 'right']} refreshControl={refresco}>
      <AppText color="textSecondary">
        Ofertas que respondiste, que expiraron o que se cancelaron.
      </AppText>
      <ContenidoConsulta consulta={ofertas} mensajeCarga="Cargando el historial…">
        {(datos) => (
          <ListaOfertas
            ofertas={separarOfertas(datos).historial}
            vacio={{
              titulo: 'Tu historial está vacío',
              descripcion: 'Aquí verás las ofertas que respondas o que expiren.',
            }}
          />
        )}
      </ContenidoConsulta>
    </Screen>
  );
}
