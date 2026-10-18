import { useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/layout';
import { DetalleOferta } from '@/features/ofertas/components/DetalleOferta';
import { useOferta } from '@/features/ofertas/hooks/useOfertas';
import { useRefrescoManual } from '@/hooks/useRefrescoManual';

export default function PantallaDetalleOferta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { refetch } = useOferta(id);
  const refresco = useRefrescoManual(refetch);

  return (
    <Screen scroll edges={['bottom', 'left', 'right']} refreshControl={refresco}>
      <DetalleOferta id={id} />
    </Screen>
  );
}
