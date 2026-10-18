import { Screen } from '@/components/layout';
import { AppText } from '@/components/ui';
import { GestionListaEspera } from '@/features/listaEspera/components/GestionListaEspera';
import { useSolicitudes } from '@/features/listaEspera/hooks/useListaEspera';
import { useRefrescoManual } from '@/hooks/useRefrescoManual';

export default function ListaEspera() {
  const { refetch } = useSolicitudes();
  const refresco = useRefrescoManual(refetch);

  return (
    <Screen scroll edges={['bottom', 'left', 'right']} refreshControl={refresco}>
      <AppText color="textSecondary">
        Mientras estés en una lista, te ofreceremos los cupos de esa especialidad que se liberen.
        Quien lleva más tiempo esperando tiene prioridad.
      </AppText>
      <GestionListaEspera />
    </Screen>
  );
}
