import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { Icon } from '@/components/ui';
import { opcionesTabs } from '@/constants/navegacion';
import { useAuth } from '@/context/AuthContext';
import { puedeAcceder } from '@/features/auth/rutas';

export default function PacienteLayout() {
  const { usuario } = useAuth();

  // Defensa adicional al Stack.Protected del layout raíz.
  if (!puedeAcceder(usuario, '(paciente)')) return <Redirect href="/" />;

  return (
    <Tabs screenOptions={opcionesTabs}>
      <Tabs.Screen
        name="ofertas"
        options={{
          title: 'Ofertas',
          tabBarIcon: ({ color, size }) => <Icon name="flash-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="citas"
        options={{
          title: 'Citas',
          tabBarIcon: ({ color, size }) => (
            <Icon name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notificaciones"
        options={{
          title: 'Avisos',
          tabBarAccessibilityLabel: 'Notificaciones',
          tabBarIcon: ({ color, size }) => (
            <Icon name="notifications-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Icon name="person-circle-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
