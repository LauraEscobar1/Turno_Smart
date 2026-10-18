/**
 * Flujos de punta a punta sobre las rutas reales de `app/` y el servidor simulado.
 */
import { fireEvent, screen, within } from 'expo-router/testing-library';

import { navegar, renderizarApp } from '@/test-utils/renderApp';

async function entrarComo(boton: 'Entrar como paciente demo' | 'Entrar como staff demo') {
  await renderizarApp();
  await fireEvent.press(await screen.findByRole('button', { name: boton }));
}

describe('flujos del modo demo', () => {
  it('paciente: abre su oferta pendiente, la acepta y la ve en Mis citas', async () => {
    await entrarComo('Entrar como paciente demo');

    // La oferta pendiente se muestra con su cuenta regresiva.
    const tarjeta = await screen.findByRole('button', {
      name: /^Medicina general, .*Estado: Pendiente$/,
    });
    expect(within(tarjeta).getByRole('timer')).toBeOnTheScreen();
    await fireEvent.press(tarjeta);

    await fireEvent.press(await screen.findByRole('button', { name: 'Aceptar cupo' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Sí, aceptar cupo' }));
    expect(await screen.findByText('Cita confirmada')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Ver mis citas' }));
    expect(await screen.findByText('Mis citas')).toBeOnTheScreen();
    // La cita recuperada de la semilla más la que se acaba de aceptar.
    expect(
      await screen.findAllByLabelText('Origen: cupo recuperado de una cancelación'),
    ).toHaveLength(2);
  });

  it('paciente: el contador de la pestaña muestra las notificaciones sin leer', async () => {
    await entrarComo('Entrar como paciente demo');
    expect(
      await screen.findByRole('button', { name: /^Notificaciones, 1 sin leer/ }),
    ).toBeOnTheScreen();
  });

  it('staff: registra una cancelación y el cupo liberado aparece en Cupos', async () => {
    await entrarComo('Entrar como staff demo');
    expect(await screen.findByText('Panel del consultorio')).toBeOnTheScreen();

    await navegar('/(staff)/cupos');
    const antes = (await screen.findAllByLabelText(/^Cupo de /)).length;

    await navegar('/(staff)/agenda');
    const [registrar] = await screen.findAllByRole('button', { name: 'Registrar cancelación' });
    await fireEvent.press(registrar!);
    await fireEvent.press(await screen.findByRole('button', { name: 'Sí, registrar cancelación' }));
    expect(
      await screen.findByText('Cancelación registrada. El cupo se está ofreciendo.'),
    ).toBeOnTheScreen();

    await navegar('/(staff)/cupos');
    expect(await screen.findAllByLabelText(/^Cupo de /)).toHaveLength(antes + 1);
  });

  it('staff: la agenda marca el riesgo como estimación ficticia', async () => {
    await entrarComo('Entrar como staff demo');
    await navegar('/(staff)/agenda');
    expect(
      (await screen.findAllByText('Estimación ficticia · la IA llega en la Fase 5')).length,
    ).toBeGreaterThan(0);
  });
});
