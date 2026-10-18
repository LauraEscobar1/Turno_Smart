import { StyleSheet, View } from 'react-native';

import { AppText, Card, Divider } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { ExplicacionPrioridad, FactoresPrioridad, FuenteExplicacion } from '@/types';
import { formatearPorcentaje } from '@/utils/numeros';

const FACTORES: { clave: keyof FactoresPrioridad; titulo: string }[] = [
  { clave: 'tiempoEspera', titulo: 'Tiempo en lista de espera' },
  { clave: 'compatibilidadHoraria', titulo: 'Compatibilidad con tu horario' },
  { clave: 'distancia', titulo: 'Distancia al consultorio' },
  { clave: 'historialRespuesta', titulo: 'Cómo has respondido antes' },
];

const NOTA_FUENTE: Record<FuenteExplicacion, string> = {
  regla_simulada:
    'Simulación (Fase 2): esta prioridad la calculó una regla de demostración. En la versión final la calcula el consultorio con reglas verificables y apoyo de IA. Nunca se usan datos clínicos.',
  regla_backend: 'La prioridad la calculó el consultorio con reglas verificables.',
  ia: 'La IA sugirió esta prioridad y el sistema del consultorio la verificó antes de enviarte la oferta.',
};

const nivel = (valor: number) => (valor >= 0.67 ? 'alto' : valor >= 0.34 ? 'medio' : 'bajo');

/** "¿Por qué recibí esta oferta?": factores de priorización en lenguaje claro. */
export function ExplicacionOferta({ explicacion }: { explicacion: ExplicacionPrioridad }) {
  return (
    <Card>
      <AppText variant="subtitle" accessibilityRole="header">
        ¿Por qué recibí esta oferta?
      </AppText>
      <AppText color="textSecondary">
        Elegimos a quién ofrecer cada cupo según estos factores. Así influyeron en tu caso:
      </AppText>
      {FACTORES.map(({ clave, titulo }, i) => {
        const factor = explicacion.factores[clave];
        return (
          <View key={clave} style={styles.factor}>
            {i > 0 ? <Divider spacingY="xs" /> : null}
            <View style={styles.cabecera}>
              <AppText variant="bodyStrong" style={styles.titulo}>
                {titulo}
              </AppText>
              <AppText variant="caption" color="textSecondary">
                Peso {formatearPorcentaje(factor.peso)}
              </AppText>
            </View>
            <AppText>{factor.detalle}</AppText>
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={`Cuánto te favoreció ${titulo.toLowerCase()}: ${nivel(factor.valor)}`}
              accessibilityValue={{ min: 0, max: 100, now: Math.round(factor.valor * 100) }}
              style={styles.barra}
            >
              <View style={[styles.relleno, { width: `${Math.round(factor.valor * 100)}%` }]} />
            </View>
          </View>
        );
      })}
      <AppText variant="caption" color="textSecondary">
        {NOTA_FUENTE[explicacion.fuente]}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  factor: {
    gap: spacing.xs,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  titulo: {
    flex: 1,
  },
  barra: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  relleno: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
});
