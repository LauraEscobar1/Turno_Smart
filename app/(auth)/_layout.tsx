import { Stack } from 'expo-router';

import { opcionesPila } from '@/constants/navegacion';

export default function AuthLayout() {
  return (
    <Stack screenOptions={opcionesPila}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen
        name="registro"
        options={{ title: 'Crear cuenta', headerBackTitle: 'Volver' }}
      />
    </Stack>
  );
}
