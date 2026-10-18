import { Controller, useFieldArray, type Control, type FieldErrors } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Notice, SelectorUnico, Stepper } from '@/components/ui';
import { DIAS_SEMANA, ORDEN_DIAS } from '@/constants/estados';
import { DURACION_FRANJA_POR_DEFECTO_MIN, HORARIO_ATENCION } from '@/constants/reglas';
import { spacing } from '@/theme';
import type { DiaSemana } from '@/types';
import { horaAMinutos, minutosAHora } from '@/utils/fechas';
import type { DatosPreferencias, ValoresPreferencias } from '@/validacion/preferencias';

const MINUTO_INICIO = horaAMinutos(HORARIO_ATENCION.inicio);
const MINUTO_FIN = horaAMinutos(HORARIO_ATENCION.fin);
const PASO = HORARIO_ATENCION.pasoMin;

const OPCIONES_DIA = ORDEN_DIAS.map((dia) => ({
  valor: dia,
  etiqueta: DIAS_SEMANA[dia].corto,
  descripcion: DIAS_SEMANA[dia].largo,
}));

export interface EditorFranjasProps {
  control: Control<ValoresPreferencias, unknown, DatosPreferencias>;
  errores: FieldErrors<ValoresPreferencias>['franjas'];
}

/** Agregar y quitar franjas semanales. Las reglas (inicio < fin, sin solapes) vienen de zod. */
export function EditorFranjas({ control, errores }: EditorFranjasProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'franjas' });

  const agregar = () => {
    const usados = new Set(fields.map((f) => f.diaSemana));
    const dia: DiaSemana = ORDEN_DIAS.find((d) => !usados.has(d)) ?? 1;
    append({
      diaSemana: dia,
      horaInicio: '08:00',
      horaFin: minutosAHora(horaAMinutos('08:00') + DURACION_FRANJA_POR_DEFECTO_MIN),
    });
  };

  return (
    <View style={styles.contenedor}>
      <AppText variant="subtitle" accessibilityRole="header">
        Franjas horarias
      </AppText>
      <AppText color="textSecondary">
        ¿Cuándo podrías asistir a una cita de último minuto? Si no agregas franjas, te ofreceremos
        cupos en cualquier horario.
      </AppText>

      {fields.map((campo, indice) => (
        <Card key={campo.id}>
          <Controller
            control={control}
            name={`franjas.${indice}.diaSemana`}
            render={({ field }) => (
              <SelectorUnico
                label={`Franja ${indice + 1}: día`}
                opciones={OPCIONES_DIA}
                valor={field.value as DiaSemana}
                onCambiar={field.onChange}
              />
            )}
          />
          <View style={styles.horas}>
            <CampoHora control={control} nombre={`franjas.${indice}.horaInicio`} etiqueta="Desde" />
            <CampoHora control={control} nombre={`franjas.${indice}.horaFin`} etiqueta="Hasta" />
          </View>
          {errores?.[indice]?.horaInicio?.message ? (
            <AppText variant="caption" color="error" accessibilityRole="alert">
              {errores[indice]?.horaInicio?.message}
            </AppText>
          ) : null}
          {errores?.[indice]?.horaFin?.message ? (
            <AppText variant="caption" color="error" accessibilityRole="alert">
              {errores[indice]?.horaFin?.message}
            </AppText>
          ) : null}
          <Button
            title="Quitar franja"
            variant="ghost"
            onPress={() => remove(indice)}
            accessibilityLabel={`Quitar franja ${indice + 1}`}
          />
        </Card>
      ))}

      {errores?.root?.message || errores?.message ? (
        <Notice tone="error" title={errores.root?.message ?? errores.message ?? ''} />
      ) : null}

      <Button title="Agregar franja" variant="secondary" onPress={agregar} />
    </View>
  );
}

function CampoHora({
  control,
  nombre,
  etiqueta,
}: {
  control: EditorFranjasProps['control'];
  nombre: `franjas.${number}.horaInicio` | `franjas.${number}.horaFin`;
  etiqueta: string;
}) {
  return (
    <Controller
      control={control}
      name={nombre}
      render={({ field, fieldState }) => {
        const minutos = horaAMinutos(field.value);
        return (
          <Stepper
            label={etiqueta}
            valor={field.value}
            onIncrementar={() => field.onChange(minutosAHora(minutos + PASO))}
            onDecrementar={() => field.onChange(minutosAHora(minutos - PASO))}
            puedeIncrementar={minutos + PASO <= MINUTO_FIN}
            puedeDecrementar={minutos - PASO >= MINUTO_INICIO}
            error={fieldState.error?.message}
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: spacing.md,
  },
  horas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
