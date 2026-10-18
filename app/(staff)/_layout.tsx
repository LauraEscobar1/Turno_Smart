import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { Icon } from '@/components/ui';
import { opcionesTabs } from '@/constants/navegacion';
import { useAuth } from '@/context/AuthContext';
import { puedeAcceder } from '@/features/auth/rutas';

export default function StaffLayout() {
  const { usuario } = useAuth();

  // Defensa adicional al Stack.Protected del layout raíz.
  if (!puedeAcceder(usuario, '(staff)')) return <Redirect href="/" />;

  return (
    <Tabs screenOptions={opcionesTabs}>
      <Tabs.Screen
        name="panel"
        options={{
          title: 'Panel',
          tabBarIcon: ({ color, size }) => (
            <Icon name="stats-chart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => <Icon name="today-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="cupos"
        options={{
          title: 'Cupos',
          tabBarIcon: ({ color, size }) => (
            <Icon name="calendar-clear-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="ofertas"
        options={{
          title: 'Ofertas',
          tabBarIcon: ({ color, size }) => (
            <Icon name="paper-plane-outline" color={color} size={size} />
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
