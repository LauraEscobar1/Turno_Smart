import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout';
import { AppText, Button, Notice, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { spacing } from '@/theme';

export default function Registro() {
  const { modoDemo } = useAuth();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <AppText color="textSecondary">
        Crea tu cuenta de paciente para recibir ofertas de cupos que se liberan en tu consultorio.
      </AppText>

      {modoDemo ? (
        <Notice
          tone="warning"
          title="MODO DEMO"
          message="El registro se habilita en la Fase 4, al conectar Supabase. Por ahora usa los accesos de demostración."
        />
      ) : null}

      <View style={styles.formulario}>
        <TextField
          label="Nombre completo"
          value={nombre}
          onChangeText={setNombre}
          autoComplete="name"
          textContentType="name"
          editable={!modoDemo}
        />
        <TextField
          label="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          editable={!modoDemo}
        />
        <TextField
          label="Teléfono (opcional)"
          helper="Lo usaremos para avisarte de cupos de último minuto."
          value={telefono}
          onChangeText={setTelefono}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          editable={!modoDemo}
        />
        <TextField
          label="Contraseña"
          helper="Mínimo 8 caracteres."
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          editable={!modoDemo}
        />
      </View>

      <Button title="Crear cuenta" disabled={modoDemo} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  formulario: {
    gap: spacing.lg,
  },
});
