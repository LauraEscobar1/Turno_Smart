import { Screen } from '@/components/layout';
import { AppText, ContenidoConsulta } from '@/components/ui';
import { FormularioPreferencias } from '@/features/preferencias/components/FormularioPreferencias';
import { usePreferencias } from '@/features/preferencias/hooks/usePreferencias';
import { useEspecialidades } from '@/hooks/useEspecialidades';

export default function Preferencias() {
  const preferencias = usePreferencias();
  const especialidades = useEspecialidades();

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <AppText color="textSecondary">
        Usamos tus preferencias para ofrecerte solo los cupos que te sirven.
      </AppText>
      <ContenidoConsulta consulta={preferencias} mensajeCarga="Cargando tus preferencias…">
        {(datosPreferencias) => (
          <ContenidoConsulta consulta={especialidades}>
            {(datosEspecialidades) => (
              <FormularioPreferencias
                preferencias={datosPreferencias}
                especialidades={datosEspecialidades}
              />
            )}
          </ContenidoConsulta>
        )}
      </ContenidoConsulta>
    </Screen>
  );
}
