import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

type IoniconsProps = ComponentProps<typeof Ionicons>;

export type IconName = IoniconsProps['name'];

export interface IconProps {
  name: IconName;
  size?: number;
  color: NonNullable<IoniconsProps['color']>;
}

/** Icono decorativo: siempre acompaña a un texto, así que se oculta al lector de pantalla. */
export function Icon({ name, size = 24, color }: IconProps) {
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
