import { Pressable, StyleSheet, View } from 'react-native';

import { colors, layout, radius, spacing } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

export interface StepperProps {
  label: string;
  /** Texto que se muestra y se anuncia ("08:30"). */
  valor: string;
  onIncrementar: () => void;
  onDecrementar: () => void;
  puedeIncrementar: boolean;
  puedeDecrementar: boolean;
  error?: string;
}

/**
 * Selector −/+ sin dependencias nativas (sirve en Expo Go). Para lectores de
 * pantalla es un control "ajustable": se cambia deslizando arriba/abajo.
 */
export function Stepper({
  label,
  valor,
  onIncrementar,
  onDecrementar,
  puedeIncrementar,
  puedeDecrementar,
  error,
}: StepperProps) {
  return (
    <View style={styles.contenedor}>
      <AppText variant="caption" color="textSecondary" importantForAccessibility="no">
        {label}
      </AppText>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: valor }}
        accessibilityHint={error}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(evento) => {
          if (evento.nativeEvent.actionName === 'increment' && puedeIncrementar) onIncrementar();
          if (evento.nativeEvent.actionName === 'decrement' && puedeDecrementar) onDecrementar();
        }}
        style={[styles.control, error ? styles.controlError : null]}
      >
        <BotonPaso
          icono="remove"
          etiqueta={`Restar a ${label}`}
          onPress={onDecrementar}
          disabled={!puedeDecrementar}
        />
        <AppText variant="bodyStrong" style={styles.valor}>
          {valor}
        </AppText>
        <BotonPaso
          icono="add"
          etiqueta={`Sumar a ${label}`}
          onPress={onIncrementar}
          disabled={!puedeIncrementar}
        />
      </View>
    </View>
  );
}

function BotonPaso({
  icono,
  etiqueta,
  onPress,
  disabled,
}: {
  icono: 'add' | 'remove';
  etiqueta: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled }}
      hitSlop={4}
      style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado]}
    >
      <Icon name={icono} size={20} color={disabled ? colors.border : colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // En pantallas estrechas dos steppers no caben lado a lado: se apilan.
  contenedor: {
    flexGrow: 1,
    flexBasis: 150,
    gap: spacing.xxs,
  },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  controlError: {
    borderColor: colors.tones.error.solid,
    borderWidth: 2,
  },
  boton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  botonPresionado: {
    backgroundColor: colors.surfacePressed,
  },
  valor: {
    minWidth: 56,
    textAlign: 'center',
  },
});
