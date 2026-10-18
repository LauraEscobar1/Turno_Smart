import { Stack } from 'expo-router';

import { opcionesPila } from '@/constants/navegacion';

export default function CitasLayout() {
  return (
    <Stack screenOptions={opcionesPila}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
