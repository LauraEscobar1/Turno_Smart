import { Screen } from '@/components/layout';
import { AppText, Notice } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { FormularioRegistro } from '@/features/auth/components/FormularioRegistro';

export default function Registro() {
  const { modoDemo } = useAuth();
  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <AppText color="textSecondary">
        Crea tu cuenta de paciente para unirte a listas de espera y recibir cupos que se liberan.
      </AppText>
      {modoDemo ? (
        <Notice
          tone="warning"
          title="MODO DEMO"
          message="La cuenta se guarda en el servidor simulado y se pierde al cerrar la app."
        />
      ) : null}
      <FormularioRegistro />
    </Screen>
  );
}
