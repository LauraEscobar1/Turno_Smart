import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Screen } from '@/components/layout';
import { LoadingState } from '@/components/ui';
import { avisarSiFaltaConfiguracion } from '@/constants/env';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ConsultasProvider } from '@/context/ConsultasProvider';
import { ServiciosProvider } from '@/context/ServiciosContext';
import { ToastProvider } from '@/context/ToastContext';
import { colors } from '@/theme';

export default function RootLayout() {
  useEffect(() => {
    avisarSiFaltaConfiguracion();
  }, []);

  return (
    <SafeAreaProvider>
      <ServiciosProvider>
        <ConsultasProvider>
          <AuthProvider>
            <ToastProvider>
              <StatusBar style="dark" />
              <NavegacionRaiz />
            </ToastProvider>
          </AuthProvider>
        </ConsultasProvider>
      </ServiciosProvider>
    </SafeAreaProvider>
  );
}

/**
 * Cada grupo solo existe para el rol que le corresponde: sin sesión → (auth),
 * paciente → (paciente), staff → (staff). Si se intenta abrir una ruta protegida,
 * Expo Router redirige a `index`, que envía a la pantalla de inicio del rol.
 */
function NavegacionRaiz() {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <Screen edges={['top', 'bottom', 'left', 'right']}>
        <LoadingState message="Restaurando tu sesión…" />
      </Screen>
    );
  }

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Screen name="index" />
      <Stack.Protected guard={!usuario}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={usuario?.rol === 'paciente'}>
        <Stack.Screen name="(paciente)" />
      </Stack.Protected>
      <Stack.Protected guard={usuario?.rol === 'staff'}>
        <Stack.Screen name="(staff)" />
      </Stack.Protected>
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
