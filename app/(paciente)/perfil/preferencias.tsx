import { Screen } from '@/components/layout';
import { AppText, Card, Divider, ListItem, Notice } from '@/components/ui';
import { FRANJAS_HORARIAS } from '@/constants/estados';
import { PREFERENCIAS_FICTICIAS } from '@/features/preferencias/mocks/preferencias.ficticias';

export default function Preferencias() {
  const preferencias = PREFERENCIAS_FICTICIAS;

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <AppText color="textSecondary">
        Usamos tus preferencias para ofrecerte solo los cupos que te sirven.
      </AppText>
      <Notice
        tone="info"
        title="Datos ficticios"
        message="Preferencias de ejemplo. La edición se habilita en la Fase 2."
      />
      <Card flush>
        <ListItem
          icon="medkit-outline"
          title="Especialidades"
          subtitle={preferencias.especialidades.join(', ')}
        />
        <Divider spacingY="none" />
        <ListItem
          icon="sunny-outline"
          title="Franjas horarias"
          subtitle={preferencias.franjas.map((f) => FRANJAS_HORARIAS[f]).join(', ')}
        />
        <Divider spacingY="none" />
        <ListItem
          icon="hourglass-outline"
          title="Anticipación mínima"
          subtitle={`${preferencias.anticipacionMinHoras} horas antes de la cita`}
        />
        <Divider spacingY="none" />
        <ListItem
          icon="notifications-outline"
          title="Avisos de último minuto"
          subtitle={preferencias.notificacionesActivas ? 'Activados' : 'Desactivados'}
        />
      </Card>
    </Screen>
  );
}
