import { Stack } from 'expo-router';

import { opcionesPila } from '@/constants/navegacion';

export default function OfertasLayout() {
  return (
    <Stack screenOptions={opcionesPila}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="[id]"
        options={{ title: 'Detalle de la oferta', headerBackTitle: 'Ofertas' }}
      />
      <Stack.Screen
        name="historial"
        options={{ title: 'Historial de ofertas', headerBackTitle: 'Ofertas' }}
      />
      <Stack.Screen
        name="lista-espera"
        options={{ title: 'Lista de espera', headerBackTitle: 'Ofertas' }}
      />
    </Stack>
  );
}
