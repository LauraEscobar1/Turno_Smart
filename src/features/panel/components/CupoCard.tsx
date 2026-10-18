import { StyleSheet, View } from 'react-native';

import { AppText, Badge, Card } from '@/components/ui';
import { CANCELADA_POR, ESTADOS_CUPO } from '@/constants/estados';
import { useCuentaRegresiva } from '@/features/ofertas/hooks/useCuentaRegresiva';
import { IndicadorTiempo } from '@/features/ofertas/components/IndicadorTiempo';
import { spacing } from '@/theme';
import type { CupoDetalle } from '@/types';
import { formatearFechaHora } from '@/utils/fechas';

export interface CupoCardProps {
  cupo: CupoDetalle;
  onPress?: () => void;
}

export function CupoCard({ cupo, onPress }: CupoCardProps) {
  const estado = ESTADOS_CUPO[cupo.estado];
  const fecha = formatearFechaHora(cupo.fechaHora);
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`Cupo de ${cupo.especialidad.nombre}, ${fecha}. Estado: ${estado.label}`}
      accessibilityHint="Abre la línea de tiempo de ofertas"
    >
      <View style={styles.cabecera}>
        <AppText variant="subtitle" style={styles.titulo}>
          {cupo.especialidad.nombre}
        </AppText>
        <Badge {...estado} />
      </View>
      <AppText color="textSecondary">{cupo.profesional.nombre}</AppText>
      <AppText variant="bodyStrong">{fecha}</AppText>
      <AppText variant="caption" color="textSecondary">
        {CANCELADA_POR[cupo.canceladaPor]} ·{' '}
        {cupo.rondaActual === 0
          ? 'Sin ofertas aún'
          : `${cupo.rondaActual} ${cupo.rondaActual === 1 ? 'ronda' : 'rondas'} de oferta`}
      </AppText>
      {cupo.ofertaVigente ? <TiempoOfertaVigente expiraEn={cupo.ofertaVigente.expiraEn} /> : null}
    </Card>
  );
}

function TiempoOfertaVigente({ expiraEn }: { expiraEn: string }) {
  const tiempo = useCuentaRegresiva(expiraEn);
  return <IndicadorTiempo tiempo={tiempo} />;
}

const styles = StyleSheet.create({
  cabecera: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titulo: {
    flex: 1,
  },
});
