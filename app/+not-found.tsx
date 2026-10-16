import { router } from 'expo-router';

import { Screen } from '@/components/layout';
import { EmptyState } from '@/components/ui';

export default function NoEncontrado() {
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <EmptyState
        icon="compass-outline"
        title="Pantalla no encontrada"
        description="El enlace que abriste no existe o ya no está disponible."
        actionLabel="Ir al inicio"
        onAction={() => router.replace('/')}
      />
    </Screen>
  );
}
