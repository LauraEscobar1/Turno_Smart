import { StyleSheet, View } from 'react-native';

import { AppText, Icon } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import {
  describirTiempoRestante,
  formatearCuentaRegresiva,
  type TiempoRestante,
} from '@/utils/fechas';

const UMBRAL_URGENTE_MS = 5 * 60_000;

export interface IndicadorTiempoProps {
  tiempo: TiempoRestante;
  grande?: boolean;
}

/** Cuenta regresiva visible. El lector de pantalla la lee en minutos, no segundo a segundo. */
export function IndicadorTiempo({ tiempo, grande = false }: IndicadorTiempoProps) {
  const urgente = !tiempo.expirado && tiempo.totalMs < UMBRAL_URGENTE_MS;
  const tono = colors.tones[tiempo.expirado ? 'error' : urgente ? 'warning' : 'info'];
  const texto = tiempo.expirado
    ? 'Tiempo agotado'
    : `Responde en ${formatearCuentaRegresiva(tiempo)}`;

  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={
        tiempo.expirado
          ? 'El tiempo para responder se agotó'
          : `Tiempo para responder: ${describirTiempoRestante(tiempo)}`
      }
      style={[styles.contenedor, grande && styles.grande, { backgroundColor: tono.soft }]}
    >
      <Icon
        name={tiempo.expirado ? 'hourglass-outline' : 'timer-outline'}
        size={grande ? 24 : 18}
        color={tono.onSoft}
      />
      <AppText
        variant={grande ? 'subtitle' : 'label'}
        style={[styles.texto, { color: tono.onSoft }]}
      >
        {texto}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  grande: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  texto: {
    fontVariant: ['tabular-nums'],
  },
});
