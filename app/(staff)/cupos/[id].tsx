import { useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/layout';
import { DetalleCupo } from '@/features/panel/components/DetalleCupo';
import { useCupo } from '@/features/panel/hooks/usePanel';
import { useRefrescoManual } from '@/hooks/useRefrescoManual';

export default function PantallaDetalleCupo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { refetch } = useCupo(id);
  const refresco = useRefrescoManual(refetch);

  return (
    <Screen scroll edges={['bottom', 'left', 'right']} refreshControl={refresco}>
      <DetalleCupo id={id} />
    </Screen>
  );
}
