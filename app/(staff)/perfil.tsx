import { Header, Screen } from '@/components/layout';
import { ResumenSesion } from '@/features/auth/components/ResumenSesion';

export default function PerfilStaff() {
  return (
    <Screen scroll>
      <Header title="Perfil" />
      <ResumenSesion />
    </Screen>
  );
}
