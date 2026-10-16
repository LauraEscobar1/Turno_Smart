import { colors, typography } from '@/theme';

/** Opciones comunes de las pilas (Stack) anidadas en cada pestaña. */
export const opcionesPila = {
  headerTintColor: colors.primary,
  headerTitleStyle: { ...typography.subtitle, color: colors.text },
  headerStyle: { backgroundColor: colors.surface },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
} as const;

/** Opciones comunes de las barras de pestañas de ambos roles. */
export const opcionesTabs = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
  sceneStyle: { backgroundColor: colors.background },
} as const;
