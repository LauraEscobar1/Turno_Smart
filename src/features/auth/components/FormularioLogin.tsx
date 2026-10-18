import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { CampoTexto } from '@/components/form/CampoTexto';
import { Button, Notice } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { mensajeDeError } from '@/services';
import { spacing } from '@/theme';
import { esquemaLogin, type ValoresLogin } from '@/validacion/auth';

export function FormularioLogin() {
  const { iniciarSesion } = useAuth();
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(esquemaLogin),
    defaultValues: { email: '', password: '' } satisfies ValoresLogin,
  });

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);
    try {
      await iniciarSesion(datos);
      // El layout raíz redirige al grupo del rol.
    } catch (error) {
      setErrorServidor(mensajeDeError(error));
    }
  });

  return (
    <View style={styles.formulario}>
      {errorServidor ? <Notice tone="error" title={errorServidor} /> : null}
      <CampoTexto
        control={control}
        name="email"
        label="Correo electrónico"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <CampoTexto
        control={control}
        name="password"
        label="Contraseña"
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={() => void enviar()}
      />
      <Button title="Iniciar sesión" onPress={() => void enviar()} loading={isSubmitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  formulario: {
    gap: spacing.lg,
  },
});
