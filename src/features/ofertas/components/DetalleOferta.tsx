import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ContenidoConsulta,
  Divider,
  Notice,
  type NoticeProps,
} from '@/components/ui';
import { ESTADOS_OFERTA } from '@/constants/estados';
import { useToast } from '@/context/ToastContext';
import { RUTAS } from '@/features/auth/rutas';
import { mensajeDeError, type RespuestaOferta } from '@/services';
import { spacing } from '@/theme';
import type { EstadoOferta, OfertaDetalle } from '@/types';
import { formatearFechaHora } from '@/utils/fechas';

import { useOfertaEnVivo } from '../hooks/useOfertaEnVivo';
import { useOferta, useResponderOferta } from '../hooks/useOfertas';
import { ExplicacionOferta } from './ExplicacionOferta';
import { IndicadorTiempo } from './IndicadorTiempo';

const AVISO_POR_ESTADO: Record<Exclude<EstadoOferta, 'pendiente'>, NoticeProps> = {
  aceptada: {
    tone: 'success',
    title: 'Cita confirmada',
    message: 'Aceptaste este cupo. Ya lo encuentras en Mis citas.',
  },
  rechazada: {
    tone: 'neutral',
    title: 'Rechazaste esta oferta',
    message: 'El cupo pasó a otro paciente. Te avisaremos cuando se libere otro.',
  },
  expirada: {
    tone: 'warning',
    title: 'Esta oferta expiró',
    message: 'El tiempo para responder se agotó y el cupo pasó a otro paciente.',
  },
  cancelada: {
    tone: 'error',
    title: 'El cupo ya no está disponible',
    message: 'Se acercó la hora de la cita o el consultorio lo retiró.',
  },
};

const CONFIRMACION: Record<
  RespuestaOferta,
  { titulo: string; boton: string; tono: 'primary' | 'danger'; exito: string }
> = {
  aceptar: {
    titulo: '¿Aceptar este cupo?',
    boton: 'Sí, aceptar cupo',
    tono: 'primary',
    exito: '¡Listo! Tu cita quedó confirmada.',
  },
  rechazar: {
    titulo: '¿Rechazar este cupo?',
    boton: 'Sí, rechazar',
    tono: 'danger',
    exito: 'Rechazaste la oferta. Te avisaremos del próximo cupo.',
  },
};

export function DetalleOferta({ id }: { id: string }) {
  const consulta = useOferta(id);
  return (
    <ContenidoConsulta consulta={consulta} mensajeCarga="Cargando la oferta…">
      {(oferta) => <DetalleCargado oferta={oferta} />}
    </ContenidoConsulta>
  );
}

function DetalleCargado({ oferta }: { oferta: OfertaDetalle }) {
  const { tiempo, estado, puedeResponder } = useOfertaEnVivo(oferta);
  const responder = useResponderOferta();
  const toast = useToast();
  // La respuesta se conserva al cerrar, para que el texto no cambie durante la animación.
  const [respuesta, setRespuesta] = useState<RespuestaOferta>('aceptar');
  const [dialogoVisible, setDialogoVisible] = useState(false);
  const textos = CONFIRMACION[respuesta];

  const pedirConfirmacion = (eleccion: RespuestaOferta) => {
    setRespuesta(eleccion);
    setDialogoVisible(true);
  };

  const confirmar = () =>
    responder.mutate(
      { id: oferta.id, respuesta },
      {
        onSuccess: () => toast.mostrar(textos.exito, 'exito'),
        onError: (error) => toast.mostrar(mensajeDeError(error), 'error'),
        onSettled: () => setDialogoVisible(false),
      },
    );

  const fecha = formatearFechaHora(oferta.fechaHora);

  return (
    <View style={styles.contenedor}>
      <Card>
        <View style={styles.cabecera}>
          <AppText variant="title" style={styles.titulo}>
            {oferta.especialidad.nombre}
          </AppText>
          <Badge {...ESTADOS_OFERTA[estado]} />
        </View>
        <Divider spacingY="xs" />
        <Dato etiqueta="Profesional" valor={oferta.profesional.nombre} />
        <Dato
          etiqueta="Consultorio"
          valor={`${oferta.consultorio.nombre}\n${oferta.consultorio.direccion}`}
        />
        <Dato etiqueta="Fecha y hora" valor={fecha} />
        <Dato etiqueta="Duración" valor={`${oferta.duracionMin} minutos`} />
        {puedeResponder ? <IndicadorTiempo tiempo={tiempo} grande /> : null}
      </Card>

      {estado !== 'pendiente' ? <Notice {...AVISO_POR_ESTADO[estado]} /> : null}

      {puedeResponder ? (
        <View style={styles.acciones}>
          <Button
            title="Aceptar cupo"
            onPress={() => pedirConfirmacion('aceptar')}
            disabled={responder.isPending}
          />
          <Button
            title="Rechazar"
            variant="secondary"
            onPress={() => pedirConfirmacion('rechazar')}
            disabled={responder.isPending}
          />
        </View>
      ) : null}

      {estado === 'aceptada' ? (
        <Button
          title="Ver mis citas"
          variant="secondary"
          onPress={() => router.navigate(RUTAS.citasPaciente)}
        />
      ) : null}

      <ExplicacionOferta explicacion={oferta.explicacion} />

      <ConfirmDialog
        visible={dialogoVisible}
        title={textos.titulo}
        message={`${oferta.especialidad.nombre} con ${oferta.profesional.nombre}, ${fecha}, en ${oferta.consultorio.nombre}.`}
        confirmLabel={textos.boton}
        tone={textos.tono}
        loading={responder.isPending}
        onConfirm={confirmar}
        onCancel={() => setDialogoVisible(false)}
      />
    </View>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View accessible accessibilityLabel={`${etiqueta}: ${valor}`}>
      <AppText variant="caption" color="textSecondary">
        {etiqueta}
      </AppText>
      <AppText variant="bodyStrong">{valor}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: spacing.lg,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titulo: {
    flex: 1,
  },
  acciones: {
    gap: spacing.sm,
  },
});
