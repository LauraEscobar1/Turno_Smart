import { Stack } from 'expo-router';

import { opcionesPila } from '@/constants/navegacion';

export default function PerfilLayout() {
  return (
    <Stack screenOptions={opcionesPila}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="preferencias"
        options={{ title: 'Preferencias', headerBackTitle: 'Perfil' }}
      />
    </Stack>
  );
}
