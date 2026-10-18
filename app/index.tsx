import { Redirect } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { rutaInicialPara } from '@/features/auth/rutas';

export default function Index() {
  const { usuario } = useAuth();
  return <Redirect href={rutaInicialPara(usuario)} />;
}
