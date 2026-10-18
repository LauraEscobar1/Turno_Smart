import { router } from 'expo-router';

import { Header, Screen } from '@/components/layout';
import { Button, ContenidoConsulta } from '@/components/ui';
import { RUTAS } from '@/features/auth/rutas';
import { AccesoListaEspera } from '@/features/listaEspera/components/AccesoListaEspera';
import { ListaOfertas } from '@/features/ofertas/components/ListaOfertas';
import { separarOfertas, useOfertas } from '@/features/ofertas/hooks/useOfertas';
import { useRefrescoManual } from '@/hooks/useRefrescoManual';

export default function Ofertas() {
  const ofertas = useOfertas();
  const refresco = useRefrescoManual(ofertas.refetch);

  return (
    <Screen scroll refreshControl={refresco}>
      <Header title="Ofertas de cupos" subtitle="Cupos que se liberaron y coinciden contigo." />
      <AccesoListaEspera />
      <ContenidoConsulta consulta={ofertas} mensajeCarga="Buscando cupos para ti…">
        {(datos) => {
          const { activas, historial } = separarOfertas(datos);
          return (
            <>
              <ListaOfertas
                ofertas={activas}
                vacio={{
                  titulo: 'No tienes ofertas por ahora',
                  descripcion:
                    'Cuando se libere un cupo compatible contigo te avisaremos aquí. Desliza hacia abajo para actualizar.',
                  accion: {
                    etiqueta: 'Gestionar lista de espera',
                    alPresionar: () => router.push(RUTAS.listaEspera),
                  },
                }}
              />
              <Button
                title={`Ver historial de ofertas (${historial.length})`}
                variant="ghost"
                onPress={() => router.push(RUTAS.historialOfertas)}
              />
            </>
          );
        }}
      </ContenidoConsulta>
    </Screen>
  );
}
