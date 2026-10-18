import AsyncStorage from '@react-native-async-storage/async-storage';

import { servicios } from '@/services';

/**
 * Las pruebas que usan la app completa (renderRouter) comparten el servidor
 * simulado por defecto: cada prueba empieza sin latencia, sin fallos, con los
 * datos iniciales y sin sesión guardada.
 */
beforeEach(async () => {
  servicios.demo?.configurarLatencia({ min: 0, max: 0 });
  servicios.demo?.configurarFallos('ninguno');
  await servicios.demo?.restablecerDatos();
  await AsyncStorage.clear();
});
