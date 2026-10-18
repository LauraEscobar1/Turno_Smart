import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout';
import { AppText, Badge, Button, Card, Divider, EmptyState, Notice } from '@/components/ui';
import { ESTADOS_OFERTA } from '@/constants/estados';
import { OFERTAS_FICTICIAS } from '@/features/ofertas/mocks/ofertas.ficticias';
import { spacing } from '@/theme';
import { formatearFechaHora } from '@/utils/fechas';

export default function DetalleOferta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const oferta = OFERTAS_FICTICIAS.find((o) => o.id === id);

  if (!oferta) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <EmptyState
          icon="search-outline"
          title="No encontramos esta oferta"
          description="Es posible que haya expirado o que otro paciente ya haya tomado el cupo."
          actionLabel="Volver a ofertas"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <Card>
        <View style={styles.cabecera}>
          <AppText variant="title" style={styles.titulo}>
            {oferta.especialidad}
          </AppText>
          <Badge {...ESTADOS_OFERTA[oferta.estado]} />
        </View>
        <Divider spacingY="xs" />
        <Dato etiqueta="Profesional" valor={oferta.profesional} />
        <Dato etiqueta="Fecha y hora" valor={formatearFechaHora(oferta.fechaHora)} />
        <Dato etiqueta="Duración" valor={`${oferta.duracionMin} minutos`} />
        <Dato etiqueta="Sede" valor={oferta.sede} />
        <Dato etiqueta="Responder antes de" valor={formatearFechaHora(oferta.expiraEn)} />
      </Card>

      <Notice
        tone="info"
        title="Datos ficticios"
        message="Aceptar o rechazar ofertas se habilitará en la Fase 2 con datos simulados."
      />

      <View style={styles.acciones}>
        <Button title="Aceptar cupo" disabled />
        <Button title="Rechazar" variant="ghost" disabled />
      </View>
    </Screen>
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
