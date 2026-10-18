import { Pressable, StyleSheet, View } from 'react-native';

import { colors, layout, radius, spacing } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

export interface OpcionChip<T> {
  valor: T;
  etiqueta: string;
  /** Texto para lector de pantalla si la etiqueta es abreviada ("Lun" → "Lunes"). */
  descripcion?: string;
}

interface BaseProps<T> {
  label: string;
  opciones: readonly OpcionChip<T>[];
  error?: string;
  helper?: string;
  disabled?: boolean;
  testID?: string;
}

export interface SelectorUnicoProps<T> extends BaseProps<T> {
  valor: T;
  onCambiar: (valor: T) => void;
}

export interface SelectorMultipleProps<T> extends BaseProps<T> {
  valores: readonly T[];
  onCambiar: (valores: T[]) => void;
}

/** Elige una opción (radio). */
export function SelectorUnico<T>({ valor, onCambiar, ...props }: SelectorUnicoProps<T>) {
  return (
    <GrupoChips
      {...props}
      rol="radio"
      estaSeleccionado={(v) => Object.is(v, valor)}
      onAlternar={(v) => onCambiar(v)}
    />
  );
}

/** Elige varias opciones (casillas). */
export function SelectorMultiple<T>({ valores, onCambiar, ...props }: SelectorMultipleProps<T>) {
  const estaSeleccionado = (v: T) => valores.some((x) => Object.is(x, v));
  return (
    <GrupoChips
      {...props}
      rol="checkbox"
      estaSeleccionado={estaSeleccionado}
      onAlternar={(v) =>
        onCambiar(estaSeleccionado(v) ? valores.filter((x) => !Object.is(x, v)) : [...valores, v])
      }
    />
  );
}

interface GrupoChipsProps<T> extends BaseProps<T> {
  rol: 'radio' | 'checkbox';
  estaSeleccionado: (valor: T) => boolean;
  onAlternar: (valor: T) => void;
}

function GrupoChips<T>({
  label,
  opciones,
  error,
  helper,
  disabled = false,
  rol,
  estaSeleccionado,
  onAlternar,
  testID,
}: GrupoChipsProps<T>) {
  const mensaje = error ?? helper;
  return (
    <View style={styles.contenedor} testID={testID}>
      <AppText variant="label" accessibilityRole="header">
        {label}
      </AppText>
      <View
        style={styles.chips}
        accessibilityRole={rol === 'radio' ? 'radiogroup' : undefined}
        accessibilityLabel={label}
      >
        {opciones.map((opcion) => {
          const seleccionado = estaSeleccionado(opcion.valor);
          return (
            <Pressable
              key={String(opcion.valor)}
              onPress={() => onAlternar(opcion.valor)}
              disabled={disabled}
              accessibilityRole={rol}
              accessibilityLabel={opcion.descripcion ?? opcion.etiqueta}
              accessibilityState={{ checked: seleccionado, disabled }}
              style={({ pressed }) => [
                styles.chip,
                seleccionado && styles.chipSeleccionado,
                pressed && !seleccionado && styles.chipPresionado,
                disabled && styles.chipDeshabilitado,
              ]}
            >
              {seleccionado ? <Icon name="checkmark" size={18} color={colors.onPrimary} /> : null}
              <AppText
                variant="label"
                style={{ color: seleccionado ? colors.onPrimary : colors.text }}
              >
                {opcion.etiqueta}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {mensaje ? (
        <AppText
          variant="caption"
          color={error ? 'error' : 'textSecondary'}
          accessibilityRole={error ? 'alert' : undefined}
        >
          {mensaje}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipSeleccionado: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipPresionado: {
    backgroundColor: colors.surfacePressed,
  },
  chipDeshabilitado: {
    opacity: 0.6,
  },
});
