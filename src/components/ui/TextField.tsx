import { useState, type Ref } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, layout, radius, spacing, typography } from '@/theme';

import { AppText } from './AppText';

export interface TextFieldProps extends TextInputProps {
  ref?: Ref<TextInput>;
  label: string;
  error?: string;
  helper?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function TextField({
  label,
  error,
  helper,
  containerStyle,
  style,
  editable = true,
  onFocus,
  onBlur,
  accessibilityLabel,
  ...rest
}: TextFieldProps) {
  const [enfocado, setEnfocado] = useState(false);
  const mensaje = error ?? helper;
  const colorBorde = error
    ? colors.tones.error.solid
    : enfocado
      ? colors.focus
      : colors.borderStrong;

  return (
    <View style={[styles.contenedor, containerStyle]}>
      <AppText variant="label" importantForAccessibility="no">
        {label}
      </AppText>
      <TextInput
        {...rest}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={mensaje}
        accessibilityState={{ disabled: !editable }}
        editable={editable}
        placeholderTextColor={colors.textMuted}
        onFocus={(evento) => {
          setEnfocado(true);
          onFocus?.(evento);
        }}
        onBlur={(evento) => {
          setEnfocado(false);
          onBlur?.(evento);
        }}
        style={[
          styles.input,
          { borderColor: colorBorde, borderWidth: enfocado || error ? 2 : 1 },
          !editable && styles.deshabilitado,
          style,
        ]}
      />
      {mensaje ? (
        <AppText
          variant="caption"
          color={error ? 'error' : 'textSecondary'}
          accessibilityRole={error ? 'alert' : undefined}
          accessibilityLiveRegion={error ? 'polite' : 'none'}
        >
          {mensaje}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: spacing.xs,
  },
  input: {
    ...typography.body,
    minHeight: layout.controlHeight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  deshabilitado: {
    backgroundColor: colors.disabled,
    color: colors.onDisabled,
  },
});
