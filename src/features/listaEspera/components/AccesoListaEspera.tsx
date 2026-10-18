import { router } from 'expo-router';

import { Card, ListItem } from '@/components/ui';
import { RUTAS } from '@/features/auth/rutas';

import { useSolicitudes } from '../hooks/useListaEspera';

/** Atajo desde Ofertas: cuántas listas de espera tiene activas el paciente. */
export function AccesoListaEspera() {
  const { data } = useSolicitudes();
  const activas = data?.filter((s) => s.estado === 'activa') ?? [];
  const subtitulo =
    data === undefined
      ? 'Elige las especialidades en las que esperas cita'
      : activas.length === 0
        ? 'No estás en ninguna lista. Únete para recibir ofertas.'
        : `Esperas cita en: ${activas.map((s) => s.especialidad.nombre).join(', ')}`;

  return (
    <Card flush>
      <ListItem
        icon="people-outline"
        title="Lista de espera"
        subtitle={subtitulo}
        onPress={() => router.push(RUTAS.listaEspera)}
        accessibilityHint="Abre tus listas de espera"
      />
    </Card>
  );
}
