import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Header, Screen } from '@/components/layout';
import { AppText, Button, Divider } from '@/components/ui';
import { AccesosDemo } from '@/features/auth/components/AccesosDemo';
import { FormularioLogin } from '@/features/auth/components/FormularioLogin';
import { RUTAS } from '@/features/auth/rutas';
import { spacing } from '@/theme';

export default function Login() {
  return (
    <Screen scroll edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="TurnoSmart"
        subtitle="Recuperamos los cupos médicos que se liberan para que nadie se quede sin cita."
      />
      <FormularioLogin />
      <Divider />
      <AccesosDemo />
      <View style={styles.seccion}>
        <AppText color="textSecondary" align="center">
          ¿Aún no tienes cuenta?
        </AppText>
        <Button
          title="Crear cuenta de paciente"
          variant="ghost"
          onPress={() => router.push(RUTAS.registro)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  seccion: {
    gap: spacing.xs,
  },
});
