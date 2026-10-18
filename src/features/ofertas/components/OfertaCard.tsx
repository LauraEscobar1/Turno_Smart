import { StyleSheet, View } from 'react-native';

import { AppText, Badge, Card } from '@/components/ui';
import { ESTADOS_OFERTA } from '@/constants/estados';
import { spacing } from '@/theme';
import type { OfertaDetalle } from '@/types';
import { formatearFechaHora } from '@/utils/fechas';

import { useOfertaEnVivo } from '../hooks/useOfertaEnVivo';
import { IndicadorTiempo } from './IndicadorTiempo';

export interface OfertaCardProps {
  oferta: OfertaDetalle;
  onPress?: () => void;
}

export function OfertaCard({ oferta, onPress }: OfertaCardProps) {
  const { tiempo, estado, puedeResponder } = useOfertaEnVivo(oferta);
  const presentacion = ESTADOS_OFERTA[estado];
  const fecha = formatearFechaHora(oferta.fechaHora);
  const cierre = oferta.respondidaEn
    ? `Respondida: ${formatearFechaHora(oferta.respondidaEn)}`
    : estado === 'expirada'
      ? `Venció: ${formatearFechaHora(oferta.expiraEn)}`
      : null;

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${oferta.especialidad.nombre}, ${fecha}, ${oferta.consultorio.nombre}. Estado: ${presentacion.label}`}
      accessibilityHint="Abre el detalle de la oferta"
    >
      <View style={styles.cabecera}>
        <AppText variant="subtitle" style={styles.titulo}>
          {oferta.especialidad.nombre}
        </AppText>
        <Badge {...presentacion} />
      </View>
      <AppText color="textSecondary">
        {oferta.profesional.nombre} · {oferta.consultorio.nombre}
      </AppText>
      <AppText variant="bodyStrong">{fecha}</AppText>
      {puedeResponder ? <IndicadorTiempo tiempo={tiempo} /> : null}
      {!puedeResponder && cierre ? (
        <AppText variant="caption" color="textSecondary">
          {cierre}
        </AppText>
      ) : null}
    </Card>
  );
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
