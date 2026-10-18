import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, EmptyState, Icon, type IconName } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { mensajeDeError } from '@/services';
import { colors, layout, radius, spacing, type TonoEstado } from '@/theme';
import type { Notificacion, TipoNotificacion } from '@/types';
import { formatearFechaHora } from '@/utils/fechas';

import { useMarcarLeida, useMarcarTodasLeidas } from '../hooks/useNotificaciones';

const ESTILO_TIPO: Record<TipoNotificacion, { icono: IconName; tono: TonoEstado }> = {
  oferta_nueva: { icono: 'flash', tono: 'primary' },
  oferta_expirada: { icono: 'hourglass-outline', tono: 'warning' },
  cita_confirmada: { icono: 'checkmark-circle', tono: 'success' },
  cita_cancelada: { icono: 'close-circle', tono: 'error' },
};

export function ListaNotificaciones({ notificaciones }: { notificaciones: Notificacion[] }) {
  const marcarLeida = useMarcarLeida();
  const marcarTodas = useMarcarTodasLeidas();
  const toast = useToast();
  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  if (notificaciones.length === 0) {
    return (
      <EmptyState
        icon="notifications-outline"
        title="Sin notificaciones"
        description="Te avisaremos aquí cuando se libere un cupo compatible contigo."
      />
    );
  }

  const abrir = (notificacion: Notificacion) => {
    if (!notificacion.leida) marcarLeida.mutate(notificacion.id);
    if (notificacion.ofertaId) {
      router.navigate({
        pathname: '/(paciente)/ofertas/[id]',
        params: { id: notificacion.ofertaId },
      });
    }
  };

  return (
    <View style={styles.contenedor}>
      <View style={styles.resumen}>
        <AppText color="textSecondary">
          {noLeidas === 0 ? 'Todo leído' : `${noLeidas} sin leer`}
        </AppText>
        <Button
          title="Marcar todas como leídas"
          variant="ghost"
          disabled={noLeidas === 0}
          loading={marcarTodas.isPending}
          onPress={() =>
            marcarTodas.mutate(undefined, {
              onError: (error) => toast.mostrar(mensajeDeError(error), 'error'),
            })
          }
        />
      </View>

      <Card flush>
        {notificaciones.map((notificacion, i) => (
          <ItemNotificacion
            key={notificacion.id}
            notificacion={notificacion}
            primera={i === 0}
            onPress={() => abrir(notificacion)}
          />
        ))}
      </Card>
    </View>
  );
}

function ItemNotificacion({
  notificacion,
  primera,
  onPress,
}: {
  notificacion: Notificacion;
  primera: boolean;
  onPress: () => void;
}) {
  const { icono, tono } = ESTILO_TIPO[notificacion.tipo];
  const colorTono = colors.tones[tono];
  const fecha = formatearFechaHora(notificacion.creadaEn);
  const accion = notificacion.ofertaId ? 'Abre la oferta' : 'Marca como leída';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${notificacion.leida ? '' : 'No leída. '}${notificacion.titulo}. ${notificacion.cuerpo}. ${fecha}`}
      accessibilityHint={accion}
      style={({ pressed }) => [
        styles.item,
        !primera && styles.separador,
        !notificacion.leida && styles.noLeida,
        pressed && styles.presionada,
      ]}
    >
      <View style={[styles.icono, { backgroundColor: colorTono.soft }]}>
        <Icon name={icono} size={20} color={colorTono.onSoft} />
      </View>
      <View style={styles.textos}>
        <View style={styles.fila}>
          <AppText variant={notificacion.leida ? 'body' : 'bodyStrong'} style={styles.flex}>
            {notificacion.titulo}
          </AppText>
          {!notificacion.leida ? (
            <View style={styles.punto} accessibilityElementsHidden importantForAccessibility="no" />
          ) : null}
        </View>
        <AppText color="textSecondary">{notificacion.cuerpo}</AppText>
        <AppText variant="caption" color="textMuted">
          {fecha}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: spacing.md,
  },
  resumen: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  item: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  separador: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  noLeida: {
    backgroundColor: colors.tones.primary.soft,
  },
  presionada: {
    backgroundColor: colors.surfacePressed,
  },
  icono: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    flex: 1,
    gap: spacing.xxs,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  punto: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
});
