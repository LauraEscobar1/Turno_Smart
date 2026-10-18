import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  Divider,
  Notice,
  SelectorMultiple,
  SelectorUnico,
} from '@/components/ui';
import { OPCIONES_ANTELACION_HORAS, OPCIONES_DISTANCIA_KM } from '@/constants/reglas';
import { useToast } from '@/context/ToastContext';
import { mensajeDeError } from '@/services';
import { spacing } from '@/theme';
import type { Especialidad, PreferenciasPaciente } from '@/types';
import { formatearFechaHora } from '@/utils/fechas';
import { esquemaPreferencias, type ValoresPreferencias } from '@/validacion/preferencias';

import { useGuardarPreferencias } from '../hooks/usePreferencias';
import { EditorFranjas } from './EditorFranjas';

const OPCIONES_DISTANCIA = OPCIONES_DISTANCIA_KM.map((km) => ({
  valor: km,
  etiqueta: km === null ? 'Sin límite' : `${km} km`,
  descripcion: km === null ? 'Sin límite de distancia' : `Hasta ${km} kilómetros`,
}));

const OPCIONES_ANTELACION = OPCIONES_ANTELACION_HORAS.map((horas) => ({
  valor: horas,
  etiqueta: `${horas} h`,
  descripcion: `${horas} ${horas === 1 ? 'hora' : 'horas'} antes`,
}));

const aValores = (p: PreferenciasPaciente): ValoresPreferencias => ({
  especialidadIds: p.especialidadIds,
  franjas: p.franjas,
  distanciaMaxKm: p.distanciaMaxKm,
  antelacionMinHoras: p.antelacionMinHoras,
});

export interface FormularioPreferenciasProps {
  preferencias: PreferenciasPaciente;
  especialidades: Especialidad[];
}

export function FormularioPreferencias({
  preferencias,
  especialidades,
}: FormularioPreferenciasProps) {
  const guardar = useGuardarPreferencias();
  const toast = useToast();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, submitCount, isValid },
  } = useForm({
    resolver: zodResolver(esquemaPreferencias),
    defaultValues: aValores(preferencias),
  });

  const enviar = handleSubmit((datos) =>
    guardar.mutate(datos, {
      onSuccess: (guardadas) => {
        reset(aValores(guardadas));
        toast.mostrar('Preferencias guardadas.', 'exito');
      },
      onError: (error) => toast.mostrar(mensajeDeError(error), 'error'),
    }),
  );

  return (
    <View style={styles.formulario}>
      {submitCount > 0 && !isValid ? (
        <Notice tone="error" title="Revisa los campos marcados antes de guardar." />
      ) : null}

      <Card>
        <Controller
          control={control}
          name="especialidadIds"
          render={({ field, fieldState }) => (
            <SelectorMultiple
              label="Especialidades de interés"
              helper="Además de tus listas de espera, te avisaremos de cupos de estas especialidades."
              opciones={especialidades.map((e) => ({ valor: e.id, etiqueta: e.nombre }))}
              valores={field.value}
              onCambiar={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      </Card>

      <EditorFranjas control={control} errores={errors.franjas} />

      <Card>
        <Controller
          control={control}
          name="distanciaMaxKm"
          render={({ field, fieldState }) => (
            <SelectorUnico
              label="Distancia máxima al consultorio"
              opciones={OPCIONES_DISTANCIA}
              valor={field.value}
              onCambiar={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Divider />
        <Controller
          control={control}
          name="antelacionMinHoras"
          render={({ field, fieldState }) => (
            <SelectorUnico
              label="Antelación mínima"
              helper="No te ofreceremos cupos que empiecen antes de este tiempo."
              opciones={OPCIONES_ANTELACION}
              valor={field.value}
              onCambiar={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      </Card>

      <Button
        title={isDirty ? 'Guardar preferencias' : 'Sin cambios por guardar'}
        onPress={() => void enviar()}
        loading={guardar.isPending}
        disabled={!isDirty}
      />
      <AppText variant="caption" color="textSecondary" align="center">
        Última actualización: {formatearFechaHora(preferencias.actualizadoEn)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  formulario: {
    gap: spacing.lg,
  },
});
