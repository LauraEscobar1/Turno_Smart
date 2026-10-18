import { router } from 'expo-router';

import { Header, Screen } from '@/components/layout';
import { EmptyState, Notice } from '@/components/ui';
import { OfertaCard } from '@/features/ofertas/components/OfertaCard';
import { OFERTAS_FICTICIAS } from '@/features/ofertas/mocks/ofertas.ficticias';

export default function Ofertas() {
  const ofertas = OFERTAS_FICTICIAS;

  return (
    <Screen scroll>
      <Header
        title="Ofertas de cupos"
        subtitle="Citas que se liberaron y coinciden con tus preferencias."
      />
      <Notice
        tone="info"
        title="Datos ficticios"
        message="Ejemplos para visualizar el diseño. Las ofertas reales llegarán desde el backend."
      />
      {ofertas.length === 0 ? (
        <EmptyState
          icon="flash-outline"
          title="No tienes ofertas por ahora"
          description="Cuando se libere un cupo compatible contigo te avisaremos aquí."
        />
      ) : (
        ofertas.map((oferta) => (
          <OfertaCard
            key={oferta.id}
            oferta={oferta}
            onPress={() =>
              router.push({ pathname: '/(paciente)/ofertas/[id]', params: { id: oferta.id } })
            }
          />
        ))
      )}
    </Screen>
  );
}
