import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Notice } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { mensajeDeError } from '@/services';
import { spacing } from '@/theme';
import type { Rol } from '@/types';

/** Accesos rápidos con las cuentas demo. Solo aparece en modo demo. */
export function AccesosDemo() {
  const { entrarComoDemo } = useAuth();
  const [entrando, setEntrando] = useState<Rol | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!entrarComoDemo) return null;

  const entrar = async (rol: Rol) => {
    setEntrando(rol);
    setError(null);
    try {
      await entrarComoDemo(rol);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEntrando(null);
    }
  };

  return (
    <View style={styles.seccion}>
      <Notice
        tone="warning"
        title="MODO DEMO"
        message="Datos ficticios en un servidor simulado. Entra con una cuenta de prueba o crea la tuya."
      />
      {error ? <Notice tone="error" title={error} /> : null}
      <Button
        title="Entrar como paciente demo"
        variant="secondary"
        onPress={() => void entrar('paciente')}
        loading={entrando === 'paciente'}
        disabled={entrando !== null}
        accessibilityHint="Inicia sesión con la cuenta de paciente de prueba"
      />
      <Button
        title="Entrar como staff demo"
        variant="secondary"
        onPress={() => void entrar('staff')}
        loading={entrando === 'staff'}
        disabled={entrando !== null}
        accessibilityHint="Inicia sesión con la cuenta del consultorio de prueba"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  seccion: {
    gap: spacing.md,
  },
});
