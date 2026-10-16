import { Header, Screen } from '@/components/layout';
import { EmptyState } from '@/components/ui';

export default function OfertasEnCurso() {
  return (
    <Screen scroll>
      <Header
        title="Ofertas en curso"
        subtitle="Pacientes a quienes se ofreció un cupo y su respuesta."
      />
      <EmptyState
        icon="paper-plane-outline"
        title="No hay ofertas en curso"
        description="Cuando un cupo liberado se ofrezca a la lista de espera, verás aquí el estado de cada oferta."
      />
    </Screen>
  );
}
