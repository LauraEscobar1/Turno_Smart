import type { ReactNode } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { colors, layout, radius, shadows, spacing } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` para acciones destructivas (cancelar una cita, rechazar). */
  tone?: 'primary' | 'danger';
  /** Mientras la acción se ejecuta: deshabilita ambos botones (evita doble envío). */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Volver',
  tone = 'primary',
  loading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={loading ? undefined : onCancel}
    >
      <View style={styles.velo}>
        <View style={styles.dialogo} accessibilityViewIsModal>
          <AppText variant="subtitle" accessibilityRole="header">
            {title}
          </AppText>
          <AppText color="textSecondary">{message}</AppText>
          {children}
          <View style={styles.acciones}>
            <Button
              title={confirmLabel}
              variant={tone === 'danger' ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={loading}
            />
            <Button title={cancelLabel} variant="ghost" onPress={onCancel} disabled={loading} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  velo: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: layout.screenPadding,
  },
  dialogo: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.lg,
  },
  acciones: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
