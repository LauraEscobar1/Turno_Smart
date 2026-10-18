import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ContenidoConsulta,
  EmptyState,
} from '@/components/ui';
import { ESTADOS_SOLICITUD } from '@/constants/estados';
import { useToast } from '@/context/ToastContext';
import { useEspecialidades } from '@/hooks/useEspecialidades';
import { mensajeDeError } from '@/services';
import { spacing } from '@/theme';
import type { Especialidad, SolicitudDetalle } from '@/types';
import { diasCalendarioEntre, formatearFechaHora } from '@/utils/fechas';

import { useSalirDeLista, useSolicitudes, useUnirseALista } from '../hooks/useListaEspera';

export function GestionListaEspera() {
  const solicitudes = useSolicitudes();
  const especialidades = useEspecialidades();
  return (
    <ContenidoConsulta consulta={solicitudes} mensajeCarga="Cargando tus listas de espera…">
      {(datosSolicitudes) => (
        <ContenidoConsulta consulta={especialidades}>
          {(datosEspecialidades) => (
            <Contenido solicitudes={datosSolicitudes} especialidades={datosEspecialidades} />
          )}
        </ContenidoConsulta>
      )}
    </ContenidoConsulta>
  );
}

function Contenido({
  solicitudes,
  especialidades,
}: {
  solicitudes: SolicitudDetalle[];
  especialidades: Especialidad[];
}) {
  const unirse = useUnirseALista();
  const salir = useSalirDeLista();
  const toast = useToast();
  const [porSalir, setPorSalir] = useState<SolicitudDetalle | null>(null);
  const [dialogoVisible, setDialogoVisible] = useState(false);

  const activas = solicitudes.filter((s) => s.estado === 'activa');
  const cerradas = solicitudes.filter((s) => s.estado !== 'activa');
  // No se ofrecen especialidades en las que ya espera (el servidor también lo impide).
  const disponibles = especialidades.filter((e) => !activas.some((s) => s.especialidadId === e.id));

  const alUnirse = (especialidad: Especialidad) =>
    unirse.mutate(especialidad.id, {
      onSuccess: () =>
        toast.mostrar(`Te uniste a la lista de espera de ${especialidad.nombre}.`, 'exito'),
      onError: (error) => toast.mostrar(mensajeDeError(error), 'error'),
    });

  const alSalir = () => {
    if (!porSalir) return;
    salir.mutate(porSalir.id, {
      onSuccess: () =>
        toast.mostrar(`Saliste de la lista de ${porSalir.especialidad.nombre}.`, 'exito'),
      onError: (error) => toast.mostrar(mensajeDeError(error), 'error'),
      onSettled: () => setDialogoVisible(false),
    });
  };

  return (
    <View style={styles.contenedor}>
      <AppText variant="subtitle" accessibilityRole="header">
        Tus listas activas
      </AppText>
      {activas.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Aún no estás en ninguna lista"
          description="Únete a la lista de una especialidad para recibir cupos que se liberen."
        />
      ) : (
        activas.map((solicitud) => {
          const dias = Math.max(diasCalendarioEntre(new Date(solicitud.creadaEn), new Date()), 0);
          return (
            <Card key={solicitud.id}>
              <View style={styles.cabecera}>
                <AppText variant="bodyStrong" style={styles.flex}>
                  {solicitud.especialidad.nombre}
                </AppText>
                <Badge {...ESTADOS_SOLICITUD.activa} />
              </View>
              <AppText variant="caption" color="textSecondary">
                Esperando desde hace {dias} {dias === 1 ? 'día' : 'días'}
              </AppText>
              <Button
                title="Salir de la lista"
                variant="ghost"
                onPress={() => {
                  setPorSalir(solicitud);
                  setDialogoVisible(true);
                }}
                disabled={salir.isPending}
                accessibilityLabel={`Salir de la lista de ${solicitud.especialidad.nombre}`}
              />
            </Card>
          );
        })
      )}

      <AppText variant="subtitle" accessibilityRole="header">
        Unirme a una lista
      </AppText>
      {disponibles.length === 0 ? (
        <AppText color="textSecondary">Ya estás en la lista de todas las especialidades.</AppText>
      ) : (
        <Card>
          {disponibles.map((especialidad) => {
            const enviando = unirse.isPending && unirse.variables === especialidad.id;
            return (
              <View key={especialidad.id} style={styles.fila}>
                <AppText style={styles.flex}>{especialidad.nombre}</AppText>
                <Button
                  title="Unirme"
                  variant="secondary"
                  onPress={() => alUnirse(especialidad)}
                  loading={enviando}
                  disabled={unirse.isPending}
                  accessibilityLabel={`Unirme a la lista de ${especialidad.nombre}`}
                />
              </View>
            );
          })}
        </Card>
      )}

      {cerradas.length > 0 ? (
        <>
          <AppText variant="subtitle" accessibilityRole="header">
            Solicitudes cerradas
          </AppText>
          {cerradas.map((solicitud) => (
            <Card key={solicitud.id}>
              <View style={styles.cabecera}>
                <AppText style={styles.flex}>{solicitud.especialidad.nombre}</AppText>
                <Badge {...ESTADOS_SOLICITUD[solicitud.estado]} />
              </View>
              {solicitud.cerradaEn ? (
                <AppText variant="caption" color="textSecondary">
                  Cerrada: {formatearFechaHora(solicitud.cerradaEn)}
                </AppText>
              ) : null}
            </Card>
          ))}
        </>
      ) : null}

      <ConfirmDialog
        visible={dialogoVisible}
        title="¿Salir de la lista de espera?"
        message={
          porSalir
            ? `Dejarás de recibir cupos de ${porSalir.especialidad.nombre} y perderás tu tiempo de espera acumulado.`
            : ''
        }
        confirmLabel="Sí, salir"
        tone="danger"
        loading={salir.isPending}
        onConfirm={alSalir}
        onCancel={() => setDialogoVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: spacing.md,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
});
