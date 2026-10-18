import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Header, Screen } from '@/components/layout';
import { AppText, Button, Divider, Notice } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { RUTAS } from '@/features/auth/rutas';
import { spacing } from '@/theme';
import type { Rol } from '@/types';

export default function Login() {
  const { entrarComoDemo } = useAuth();
  const [entrando, setEntrando] = useState<Rol | null>(null);

  const entrar = async (rol: Rol) => {
    if (!entrarComoDemo) return;
    setEntrando(rol);
    try {
      await entrarComoDemo(rol);
      // La redirección al grupo del rol la hace el layout raíz.
    } finally {
      setEntrando(null);
    }
  };

  return (
    <Screen scroll edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="TurnoSmart"
        subtitle="Recuperamos los cupos médicos que se liberan para que nadie se quede sin cita."
      />

      {entrarComoDemo ? (
        <View style={styles.seccion}>
          <Notice
            tone="warning"
            title="MODO DEMO"
            message="Sesión simulada: no se piden credenciales ni se guardan datos reales. El acceso con cuenta llega en la Fase 4."
          />
          <Button
            title="Entrar como paciente demo"
            onPress={() => entrar('paciente')}
            loading={entrando === 'paciente'}
            disabled={entrando !== null}
            accessibilityHint="Abre la app con el rol de paciente"
          />
          <Button
            title="Entrar como staff demo"
            variant="secondary"
            onPress={() => entrar('staff')}
            loading={entrando === 'staff'}
            disabled={entrando !== null}
            accessibilityHint="Abre el panel del consultorio"
          />
        </View>
      ) : (
        <Notice
          tone="info"
          title="Inicio de sesión con cuenta"
          message="Se habilita al conectar Supabase Auth (Fase 4)."
        />
      )}

      <Divider />

      <View style={styles.seccion}>
        <AppText color="textSecondary" align="center">
          ¿Aún no tienes cuenta?
        </AppText>
        <Button title="Crear cuenta" variant="ghost" onPress={() => router.push(RUTAS.registro)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  seccion: {
    gap: spacing.md,
  },
});
