import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing, type TonoEstado } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

const iconosPorTono: Record<TonoEstado, IconName> = {
  neutral: 'information-circle-outline',
  primary: 'information-circle-outline',
  info: 'information-circle-outline',
  success: 'checkmark-circle-outline',
  warning: 'warning-outline',
  error: 'alert-circle-outline',
};

export interface NoticeProps {
  title: string;
  message?: string;
  tone?: TonoEstado;
  style?: StyleProp<ViewStyle>;
}

/** Aviso en línea (por ejemplo, "MODO DEMO" o "Datos ficticios"). */
export function Notice({ title, message, tone = 'info', style }: NoticeProps) {
  const { soft, onSoft } = colors.tones[tone];
  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={message ? `${title}. ${message}` : title}
      style={[styles.aviso, { backgroundColor: soft, borderColor: onSoft }, style]}
    >
      <Icon name={iconosPorTono[tone]} size={20} color={onSoft} />
      <View style={styles.textos}>
        <AppText variant="label" style={{ color: onSoft }}>
          {title}
        </AppText>
        {message ? (
          <AppText variant="caption" style={{ color: onSoft }}>
            {message}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  aviso: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: 4,
  },
  textos: {
    flex: 1,
    gap: spacing.xxs,
  },
});
