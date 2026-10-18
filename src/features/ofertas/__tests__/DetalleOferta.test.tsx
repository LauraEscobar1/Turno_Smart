import { fireEvent, screen, within } from '@testing-library/react-native';

import { DetalleOferta } from '@/features/ofertas/components/DetalleOferta';
import { CUENTAS_DEMO, IDS } from '@/services/mock/semilla';
import { crearEntornoPrueba, renderConProveedores } from '@/test-utils/renderConProveedores';

async function prepararPacienteDemo(opciones?: Parameters<typeof crearEntornoPrueba>[0]) {
  const entorno = crearEntornoPrueba(opciones);
  await entorno.servicios.auth.iniciarSesion(CUENTAS_DEMO.paciente);
  const oferta = (await entorno.servicios.ofertas.listar()).find((o) => o.estado === 'pendiente');
  if (!oferta) throw new Error('El escenario inicial debería tener una oferta pendiente');
  await renderConProveedores(<DetalleOferta id={oferta.id} />, entorno.servicios);
  return { ...entorno, oferta };
}

async function confirmarEnDialogo(boton: string) {
  // El diálogo es un Modal: se busca el botón de confirmación por su nombre.
  await fireEvent.press(await screen.findByRole('button', { name: boton }));
}

describe('<DetalleOferta />', () => {
  it('muestra la oferta, su cuenta regresiva y la explicación de la prioridad', async () => {
    await prepararPacienteDemo();

    expect(await screen.findByText('Medicina general')).toBeOnTheScreen();
    expect(screen.getByRole('timer')).toBeOnTheScreen();
    expect(screen.getByText('¿Por qué recibí esta oferta?')).toBeOnTheScreen();
    expect(screen.getByText(/Llevas 28 días en la lista de espera/)).toBeOnTheScreen();
  });

  it('aceptar pide confirmación y confirma la cita', async () => {
    const { servicios, oferta } = await prepararPacienteDemo();

    await fireEvent.press(await screen.findByRole('button', { name: 'Aceptar cupo' }));
    expect(screen.getByText('¿Aceptar este cupo?')).toBeOnTheScreen();
    await confirmarEnDialogo('Sí, aceptar cupo');

    expect(await screen.findByText('Cita confirmada')).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('toast')).getByText('¡Listo! Tu cita quedó confirmada.'),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Aceptar cupo' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ver mis citas' })).toBeOnTheScreen();

    const citas = await servicios.citas.listar();
    expect(
      citas.some((c) => c.cupoOrigenId === oferta.cupoId && c.origen === 'cupo_recuperado'),
    ).toBe(true);
  });

  it('rechazar pide confirmación y deja la oferta como rechazada', async () => {
    await prepararPacienteDemo();

    await fireEvent.press(await screen.findByRole('button', { name: 'Rechazar' }));
    expect(screen.getByText('¿Rechazar este cupo?')).toBeOnTheScreen();
    await confirmarEnDialogo('Sí, rechazar');

    expect(await screen.findByText('Rechazaste esta oferta')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Aceptar cupo' })).toBeNull();
  });

  it('cancelar el diálogo no responde la oferta', async () => {
    const { servicios, oferta } = await prepararPacienteDemo();

    await fireEvent.press(await screen.findByRole('button', { name: 'Aceptar cupo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));

    expect((await servicios.ofertas.obtener(oferta.id)).estado).toBe('pendiente');
  });

  it('si la oferta expiró mientras decidía, muestra el error y el estado real', async () => {
    let ahora = new Date();
    const { servidor } = await prepararPacienteDemo({ reloj: () => ahora });
    await screen.findByRole('button', { name: 'Aceptar cupo' });

    // El servidor ya considera vencida la oferta (la interfaz aún no lo sabe).
    ahora = new Date(ahora.getTime() + 16 * 60_000);
    await fireEvent.press(screen.getByRole('button', { name: 'Aceptar cupo' }));
    await confirmarEnDialogo('Sí, aceptar cupo');

    expect(
      await within(await screen.findByTestId('toast')).findByText(
        'Esta oferta ya expiró. Te avisaremos cuando se libere otro cupo.',
      ),
    ).toBeOnTheScreen();
    expect(await screen.findByText('Esta oferta expiró')).toBeOnTheScreen();
    expect(
      servidor
        .instantanea()
        .citas.filter((c) => c.pacienteId === IDS.pacienteDemo && c.origen === 'cupo_recuperado'),
    ).toHaveLength(1);
  });

  it('una oferta de otro paciente no se muestra', async () => {
    const entorno = crearEntornoPrueba();
    await entorno.servicios.auth.iniciarSesion(CUENTAS_DEMO.otroPaciente);
    const deDemo = entorno.servidor
      .instantanea()
      .ofertas.find((o) => o.pacienteId === IDS.pacienteDemo && o.estado === 'pendiente');
    await renderConProveedores(<DetalleOferta id={deDemo!.id} />, entorno.servicios);

    expect(
      await screen.findByText(
        'No encontramos lo que buscabas. Es posible que ya no esté disponible.',
      ),
    ).toBeOnTheScreen();
  });
});
