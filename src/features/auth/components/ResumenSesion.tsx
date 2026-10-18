import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Avatar, Badge, Button, Card, Notice } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { spacing } from '@/theme';

const ETIQUETA_ROL = { paciente: 'Paciente', staff: 'Staff del consultorio' } as const;

/** Tarjeta de perfil con datos de la sesión y botón de cierre; compartida por ambos roles. */
export function ResumenSesion() {
  const { usuario, modoDemo, cerrarSesion } = useAuth();
  const [saliendo, setSaliendo] = useState(false);

  if (!usuario) return null;

  const salir = async () => {
    setSaliendo(true);
    try {
      await cerrarSesion();
    } finally {
      setSaliendo(false);
    }
  };

  return (
    <View style={styles.contenedor}>
      <Card>
        <View style={styles.fila}>
          <Avatar nombre={usuario.nombre} size="lg" />
          <View style={styles.textos}>
            <AppText variant="subtitle">{usuario.nombre}</AppText>
            <Badge label={ETIQUETA_ROL[usuario.rol]} tone="primary" />
          </View>
        </View>
      </Card>
      {modoDemo ? (
        <Notice
          tone="warning"
          title="MODO DEMO"
          message="Sesión simulada en memoria. Al cerrar la app o la sesión, se pierde."
        />
      ) : null}
      <Button title="Cerrar sesión" variant="secondary" onPress={salir} loading={saliendo} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: spacing.lg,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  textos: {
    flex: 1,
    gap: spacing.xs,
  },
});
