import { Header, Screen } from '@/components/layout';
import { ResumenSesion } from '@/features/auth/components/ResumenSesion';
import { HerramientasDemo } from '@/features/demo/components/HerramientasDemo';

export default function PerfilStaff() {
  return (
    <Screen scroll>
      <Header title="Perfil" />
      <ResumenSesion />
      <HerramientasDemo />
    </Screen>
  );
}
