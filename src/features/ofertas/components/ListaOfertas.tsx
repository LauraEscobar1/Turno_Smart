import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui';
import type { OfertaDetalle } from '@/types';
import { spacing } from '@/theme';

import { OfertaCard } from './OfertaCard';

export interface ListaOfertasProps {
  ofertas: readonly OfertaDetalle[];
  vacio: {
    titulo: string;
    descripcion: string;
    accion?: { etiqueta: string; alPresionar: () => void };
  };
}

/** Lista de tarjetas de oferta que abren su detalle. */
export function ListaOfertas({ ofertas, vacio }: ListaOfertasProps) {
  if (ofertas.length === 0) {
    return (
      <EmptyState
        icon="flash-outline"
        title={vacio.titulo}
        description={vacio.descripcion}
        actionLabel={vacio.accion?.etiqueta}
        onAction={vacio.accion?.alPresionar}
      />
    );
  }
  return (
    <View style={styles.lista}>
      {ofertas.map((oferta) => (
        <OfertaCard
          key={oferta.id}
          oferta={oferta}
          onPress={() =>
            router.push({ pathname: '/(paciente)/ofertas/[id]', params: { id: oferta.id } })
          }
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: {
    gap: spacing.md,
  },
});
