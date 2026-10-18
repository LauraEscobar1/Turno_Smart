import { Stack } from 'expo-router';

import { opcionesPila } from '@/constants/navegacion';

export default function CuposLayout() {
  return (
    <Stack screenOptions={opcionesPila}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle del cupo', headerBackTitle: 'Cupos' }} />
    </Stack>
  );
}
