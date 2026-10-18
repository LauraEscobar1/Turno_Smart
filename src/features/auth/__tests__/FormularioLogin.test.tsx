import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { FormularioLogin } from '@/features/auth/components/FormularioLogin';
import { CUENTAS_DEMO } from '@/services/mock/semilla';
import { crearEntornoPrueba, renderConProveedores } from '@/test-utils/renderConProveedores';

async function escribir(etiqueta: string, texto: string) {
  await fireEvent.changeText(screen.getByLabelText(etiqueta), texto);
}

describe('<FormularioLogin />', () => {
  it('muestra los errores de validación sin llamar al servidor', async () => {
    const { servicios } = crearEntornoPrueba();
    const iniciarSesion = jest.spyOn(servicios.auth, 'iniciarSesion');
    await renderConProveedores(<FormularioLogin />, servicios);

    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByText('Ingresa tu correo electrónico.')).toBeOnTheScreen();
    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres.')).toBeOnTheScreen();

    await escribir('Correo electrónico', 'no-es-un-correo');
    await escribir('Contraseña', '1234567');
    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByText('Ingresa un correo electrónico válido.')).toBeOnTheScreen();
    expect(iniciarSesion).not.toHaveBeenCalled();
  });

  it('muestra un error comprensible si las credenciales no son correctas', async () => {
    const { servicios } = crearEntornoPrueba();
    await renderConProveedores(<FormularioLogin />, servicios);

    await escribir('Correo electrónico', CUENTAS_DEMO.paciente.email);
    await escribir('Contraseña', 'clave-incorrecta');
    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(
      await screen.findByText('El correo o la contraseña no son correctos.'),
    ).toBeOnTheScreen();
  });

  it('inicia sesión con datos válidos (el correo se normaliza)', async () => {
    const { servicios } = crearEntornoPrueba();
    const oyente = jest.fn();
    servicios.auth.suscribirse(oyente);
    await renderConProveedores(<FormularioLogin />, servicios);

    await escribir('Correo electrónico', '  Paciente@Demo.TurnoSmart.co ');
    await escribir('Contraseña', CUENTAS_DEMO.paciente.password);
    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() =>
      expect(oyente).toHaveBeenCalledWith(expect.objectContaining({ rol: 'paciente' })),
    );
  });
});
