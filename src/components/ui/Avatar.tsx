import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';
import { obtenerIniciales } from '@/utils/texto';

import { AppText } from './AppText';

const tamanos = { md: 40, lg: 64 } as const;

export interface AvatarProps {
  nombre: string;
  size?: keyof typeof tamanos;
}

/** Avatar con iniciales (no se manejan fotos en esta versión). */
export function Avatar({ nombre, size = 'md' }: AvatarProps) {
  const lado = tamanos[size];
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Avatar de ${nombre}`}
      style={[styles.avatar, { width: lado, height: lado }]}
    >
      <AppText
        variant={size === 'lg' ? 'title' : 'label'}
        accessibilityRole="none"
        style={{ color: colors.tones.primary.onSoft }}
      >
        {obtenerIniciales(nombre)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: radius.pill,
    backgroundColor: colors.tones.primary.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
