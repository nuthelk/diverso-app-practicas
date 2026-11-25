import { act, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';

import { ThemeProvider, useTheme, useThemeMode, type ThemeMode } from '@/ui/theme';

let mockSystemScheme: 'light' | 'dark' | null = 'light';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockSystemScheme,
}));

let changeMode: (m: ThemeMode) => void = () => {};

function Probe() {
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();
  changeMode = setMode;
  return (
    <Text testID="sonda">
      {mode}|{theme.brightness}|{theme.colorScheme.primary}|{theme.pageBackground}
    </Text>
  );
}

beforeEach(() => {
  mockSystemScheme = 'light';
});

describe('ThemeProvider (ThemeModeViewModel de Flutter)', () => {
  it('arranca en «system» y sigue al sistema (claro)', async () => {
    await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('sonda')).toHaveTextContent('system|light|#1F6A4F|#FAFAF8');
  });

  it('en «system» con el sistema oscuro usa los tokens oscuros', async () => {
    mockSystemScheme = 'dark';
    await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('sonda')).toHaveTextContent('system|dark|#8CD5B3|#101312');
  });

  it('setModo cambia el modo efectivo sin importar el sistema', async () => {
    await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await act(async () => changeMode('dark'));
    expect(screen.getByTestId('sonda')).toHaveTextContent('dark|dark|#8CD5B3|#101312');
    await act(async () => changeMode('light'));
    expect(screen.getByTestId('sonda')).toHaveTextContent('light|light|#1F6A4F|#FAFAF8');
  });

  it('no se persiste: un provider nuevo vuelve a «system»', async () => {
    const first = await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await act(async () => changeMode('dark'));
    await first.unmount();

    await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('sonda')).toHaveTextContent('system|light|#1F6A4F|#FAFAF8');
  });

  it('cambiar el modo no remonta a los hijos (el router no se recrea)', async () => {
    const mounts = jest.fn();
    function Child() {
      // Se ejecuta una vez por montaje.
      useState(() => mounts());
      return <Probe />;
    }
    await render(
      <ThemeProvider>
        <Child />
      </ThemeProvider>,
    );
    await act(async () => changeMode('dark'));
    await act(async () => changeMode('system'));
    expect(mounts).toHaveBeenCalledTimes(1);
  });

  it('sin provider sigue al sistema (no rompe)', async () => {
    mockSystemScheme = 'dark';
    function ThemeOnly() {
      const theme = useTheme();
      return <Text testID="t">{theme.brightness}</Text>;
    }
    await render(<ThemeOnly />);
    expect(screen.getByTestId('t')).toHaveTextContent('dark');
  });
});
