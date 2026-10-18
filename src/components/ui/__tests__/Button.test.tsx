import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '@/components/ui/Button';

describe('<Button />', () => {
  it('se expone como botón accesible y responde al toque', async () => {
    const onPress = jest.fn();
    await render(<Button title="Aceptar cupo" onPress={onPress} />);

    const boton = screen.getByRole('button', { name: 'Aceptar cupo' });
    await fireEvent.press(boton);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('deshabilitado: lo anuncia y no ejecuta la acción', async () => {
    const onPress = jest.fn();
    await render(<Button title="Aceptar cupo" onPress={onPress} disabled />);

    const boton = screen.getByRole('button', { name: 'Aceptar cupo' });
    expect(boton).toBeDisabled();
    await fireEvent.press(boton);

    expect(onPress).not.toHaveBeenCalled();
  });

  it('en carga: muestra el indicador, marca busy y bloquea toques', async () => {
    const onPress = jest.fn();
    await render(<Button title="Guardar" onPress={onPress} loading />);

    const boton = screen.getByRole('button', { name: 'Guardar' });
    expect(boton).toBeBusy();
    expect(screen.getByTestId('button-spinner')).toBeTruthy();
    await fireEvent.press(boton);

    expect(onPress).not.toHaveBeenCalled();
  });
});
