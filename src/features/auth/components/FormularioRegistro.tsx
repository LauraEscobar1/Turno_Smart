import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { CampoTexto } from '@/components/form/CampoTexto';
import { Button, Notice } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { mensajeDeError } from '@/services';
import { spacing } from '@/theme';
import { esquemaRegistro, LONGITUD_MIN_PASSWORD, type ValoresRegistro } from '@/validacion/auth';

const VALORES_INICIALES: ValoresRegistro = {
  nombre: '',
  email: '',
  telefono: '',
  password: '',
  confirmacion: '',
};

export function FormularioRegistro() {
  const { registrar } = useAuth();
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(esquemaRegistro),
    defaultValues: VALORES_INICIALES,
  });

  const enviar = handleSubmit(async ({ nombre, email, telefono, password }) => {
    setErrorServidor(null);
    try {
      await registrar({ nombre, email, telefono, password });
    } catch (error) {
      setErrorServidor(mensajeDeError(error));
    }
  });

  return (
    <View style={styles.formulario}>
      {errorServidor ? <Notice tone="error" title={errorServidor} /> : null}
      <CampoTexto
        control={control}
        name="nombre"
        label="Nombre completo"
        autoComplete="name"
        textContentType="name"
      />
      <CampoTexto
        control={control}
        name="email"
        label="Correo electrónico"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <CampoTexto
        control={control}
        name="telefono"
        label="Teléfono (opcional)"
        helper="Para avisarte de cupos de último minuto."
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
      />
      <CampoTexto
        control={control}
        name="password"
        label="Contraseña"
        helper={`Mínimo ${LONGITUD_MIN_PASSWORD} caracteres.`}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <CampoTexto
        control={control}
        name="confirmacion"
        label="Confirmar contraseña"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={() => void enviar()}
      />
      <Button title="Crear cuenta" onPress={() => void enviar()} loading={isSubmitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  formulario: {
    gap: spacing.lg,
  },
});
