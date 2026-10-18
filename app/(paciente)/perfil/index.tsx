import { router } from 'expo-router';

import { Header, Screen } from '@/components/layout';
import { Card, Divider, ListItem } from '@/components/ui';
import { ResumenSesion } from '@/features/auth/components/ResumenSesion';
import { RUTAS } from '@/features/auth/rutas';
import { HerramientasDemo } from '@/features/demo/components/HerramientasDemo';

export default function PerfilPaciente() {
  return (
    <Screen scroll>
      <Header title="Perfil" />
      <ResumenSesion />
      <Card flush>
        <ListItem
          icon="options-outline"
          title="Preferencias"
          subtitle="Especialidades, horarios, distancia y antelación"
          onPress={() => router.push(RUTAS.preferencias)}
        />
        <Divider spacingY="none" />
        <ListItem
          icon="people-outline"
          title="Lista de espera"
          subtitle="Únete o sal de la lista de cada especialidad"
          onPress={() => router.navigate(RUTAS.listaEspera)}
        />
        <Divider spacingY="none" />
        <ListItem
          icon="time-outline"
          title="Historial de ofertas"
          subtitle="Ofertas respondidas o expiradas"
          onPress={() => router.navigate(RUTAS.historialOfertas)}
        />
      </Card>
      <HerramientasDemo />
    </Screen>
  );
}
