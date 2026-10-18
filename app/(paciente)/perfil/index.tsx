import { router } from 'expo-router';

import { Header, Screen } from '@/components/layout';
import { Card, ListItem } from '@/components/ui';
import { ResumenSesion } from '@/features/auth/components/ResumenSesion';

export default function PerfilPaciente() {
  return (
    <Screen scroll>
      <Header title="Perfil" />
      <ResumenSesion />
      <Card flush>
        <ListItem
          icon="options-outline"
          title="Preferencias"
          subtitle="Especialidades, horarios y avisos"
          onPress={() => router.push('/(paciente)/perfil/preferencias')}
        />
      </Card>
    </Screen>
  );
}
