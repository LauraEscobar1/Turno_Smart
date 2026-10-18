import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState, SelectorUnico } from '@/components/ui';
import { ESTADOS_CUPO } from '@/constants/estados';
import { spacing } from '@/theme';
import { ESTADOS_CUPO_VALORES, type CupoDetalle, type EstadoCupo } from '@/types';

import { CupoCard } from './CupoCard';

type Filtro = EstadoCupo | 'todos';

export function ListaCupos({ cupos }: { cupos: CupoDetalle[] }) {
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const visibles = filtro === 'todos' ? cupos : cupos.filter((c) => c.estado === filtro);

  const opciones = [
    { valor: 'todos' as Filtro, etiqueta: `Todos (${cupos.length})` },
    ...ESTADOS_CUPO_VALORES.map((estado) => ({
      valor: estado as Filtro,
      etiqueta: `${ESTADOS_CUPO[estado].label} (${cupos.filter((c) => c.estado === estado).length})`,
    })),
  ];

  return (
    <View style={styles.contenedor}>
      <SelectorUnico
        label="Filtrar por estado"
        opciones={opciones}
        valor={filtro}
        onCambiar={setFiltro}
      />
      {visibles.length === 0 ? (
        <EmptyState
          icon="calendar-clear-outline"
          title={filtro === 'todos' ? 'No hay cupos liberados' : 'Ningún cupo en este estado'}
          description="Cuando registres una cancelación, el cupo aparecerá aquí y se ofrecerá a la lista de espera."
        />
      ) : (
        visibles.map((cupo) => (
          <CupoCard
            key={cupo.id}
            cupo={cupo}
            onPress={() =>
              router.push({ pathname: '/(staff)/cupos/[id]', params: { id: cupo.id } })
            }
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: spacing.md,
  },
});
