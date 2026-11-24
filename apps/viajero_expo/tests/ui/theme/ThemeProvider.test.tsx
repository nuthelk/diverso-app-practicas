import { act, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';

import { ThemeProvider, useTheme, useThemeMode, type ModoTema } from '@/ui/theme';

let mockEsquemaDelSistema: 'light' | 'dark' | null = 'light';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockEsquemaDelSistema,
}));

let cambiarModo: (m: ModoTema) => void = () => {};

function Sonda() {
  const tema = useTheme();
  const { modo, setModo } = useThemeMode();
  cambiarModo = setModo;
  return (
    <Text testID="sonda">
      {modo}|{tema.brillo}|{tema.colorScheme.primary}|{tema.fondoPagina}
    </Text>
  );
}

beforeEach(() => {
  mockEsquemaDelSistema = 'light';
});

describe('ThemeProvider (ThemeModeViewModel de Flutter)', () => {
  it('arranca en «system» y sigue al sistema (claro)', async () => {
    await render(
      <ThemeProvider>
        <Sonda />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('sonda')).toHaveTextContent('system|light|#1F6A4F|#FAFAF8');
  });

  it('en «system» con el sistema oscuro usa los tokens oscuros', async () => {
    mockEsquemaDelSistema = 'dark';
    await render(
      <ThemeProvider>
        <Sonda />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('sonda')).toHaveTextContent('system|dark|#8CD5B3|#101312');
  });

  it('setModo cambia el modo efectivo sin importar el sistema', async () => {
    await render(
      <ThemeProvider>
        <Sonda />
      </ThemeProvider>,
    );
    await act(async () => cambiarModo('dark'));
    expect(screen.getByTestId('sonda')).toHaveTextContent('dark|dark|#8CD5B3|#101312');
    await act(async () => cambiarModo('light'));
    expect(screen.getByTestId('sonda')).toHaveTextContent('light|light|#1F6A4F|#FAFAF8');
  });

  it('no se persiste: un provider nuevo vuelve a «system»', async () => {
    const primero = await render(
      <ThemeProvider>
        <Sonda />
      </ThemeProvider>,
    );
    await act(async () => cambiarModo('dark'));
    await primero.unmount();

    await render(
      <ThemeProvider>
        <Sonda />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('sonda')).toHaveTextContent('system|light|#1F6A4F|#FAFAF8');
  });

  it('cambiar el modo no remonta a los hijos (el router no se recrea)', async () => {
    const montajes = jest.fn();
    function Hijo() {
      // Se ejecuta una vez por montaje.
      useState(() => montajes());
      return <Sonda />;
    }
    await render(
      <ThemeProvider>
        <Hijo />
      </ThemeProvider>,
    );
    await act(async () => cambiarModo('dark'));
    await act(async () => cambiarModo('system'));
    expect(montajes).toHaveBeenCalledTimes(1);
  });

  it('sin provider sigue al sistema (no rompe)', async () => {
    mockEsquemaDelSistema = 'dark';
    function SoloTema() {
      const tema = useTheme();
      return <Text testID="t">{tema.brillo}</Text>;
    }
    await render(<SoloTema />);
    expect(screen.getByTestId('t')).toHaveTextContent('dark');
  });
});
