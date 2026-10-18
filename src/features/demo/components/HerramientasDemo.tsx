import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { AppText, Button, Card, Divider, SelectorUnico } from '@/components/ui';
import { useServicios } from '@/context/ServiciosContext';
import { useToast } from '@/context/ToastContext';
import type { ModoFallos } from '@/services';

const OPCIONES_FALLOS: { valor: ModoFallos; etiqueta: string; descripcion: string }[] = [
  { valor: 'ninguno', etiqueta: 'Sin fallos', descripcion: 'Sin fallos de conexión' },
  {
    valor: 'intermitente',
    etiqueta: 'Intermitentes',
    descripcion: 'Fallos intermitentes, 30 por ciento',
  },
  { valor: 'siempre', etiqueta: 'Siempre', descripcion: 'Todas las peticiones fallan' },
];

/**
 * Interruptores de desarrollo del modo demo: simular errores de red y
 * restablecer los datos ficticios. No existe fuera del modo demo.
 */
export function HerramientasDemo() {
  const { demo } = useServicios();
  const cliente = useQueryClient();
  const toast = useToast();
  const [modo, setModo] = useState<ModoFallos>(() => demo?.obtenerModoFallos() ?? 'ninguno');
  const [restableciendo, setRestableciendo] = useState(false);

  if (!demo) return null;

  const cambiarModo = (nuevo: ModoFallos) => {
    demo.configurarFallos(nuevo);
    setModo(nuevo);
    toast.mostrar(
      nuevo === 'ninguno' ? 'Conexión simulada restablecida.' : 'Fallos de conexión activados.',
      'info',
    );
  };

  const restablecer = async () => {
    setRestableciendo(true);
    try {
      await demo.restablecerDatos();
      await cliente.invalidateQueries();
      toast.mostrar('Datos de demostración restablecidos.', 'exito');
    } finally {
      setRestableciendo(false);
    }
  };

  return (
    <Card>
      <AppText variant="subtitle" accessibilityRole="header">
        Herramientas de desarrollo
      </AppText>
      <AppText variant="caption" color="textSecondary">
        Solo en modo demo. Sirven para probar los estados de error y volver al escenario inicial.
      </AppText>
      <SelectorUnico
        label="Simular fallos de conexión"
        opciones={OPCIONES_FALLOS}
        valor={modo}
        onCambiar={cambiarModo}
      />
      <Divider />
      <Button
        title="Restablecer datos de demostración"
        variant="secondary"
        onPress={() => void restablecer()}
        loading={restableciendo}
        accessibilityHint="Vuelve a generar las citas, ofertas y cupos ficticios"
      />
    </Card>
  );
}
