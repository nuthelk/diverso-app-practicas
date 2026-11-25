import { act, screen } from '@testing-library/react-native';
import { Keyboard, Platform, StyleSheet, type KeyboardEvent } from 'react-native';

import { BarraPagar } from '@/features/checkout/components/BarraPagar';

import { renderWithTheme } from '../../../ui/support/render-with-theme';

/**
 * La barra de pagar sube con el teclado. En iOS llegan `keyboardWill*`; en Android SOLO
 * `keyboardDid*` (ver `Keyboard.js` de RN) y, con edge-to-edge (SDK 58), la ventana ya no se
 * achica: si la barra no suma el alto del teclado, queda tapada.
 */

type Oyente = (e: KeyboardEvent) => void;

let oyentes: Map<string, Oyente>;
let osOriginal: typeof Platform.OS;

function fijarSO(so: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => so });
}

beforeEach(() => {
  oyentes = new Map();
  osOriginal = Platform.OS;
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((evento: string, oyente: Oyente) => {
    oyentes.set(evento, oyente);
    return { remove: () => oyentes.delete(evento) };
  }) as never);
});

afterEach(() => {
  fijarSO(osOriginal);
  jest.restoreAllMocks();
});

const teclado = (alto: number) => ({ endCoordinates: { height: alto, screenX: 0, screenY: 0, width: 400 } }) as KeyboardEvent;

const relleno = () => StyleSheet.flatten(screen.getByTestId('barra-pagar').props.style).paddingBottom;

async function montar() {
  await renderWithTheme(<BarraPagar total={190000} pax={2} procesando={false} onPagar={() => {}} />);
}

test.each([
  ['ios', 'keyboardWillShow', 'keyboardWillHide'],
  ['android', 'keyboardDidShow', 'keyboardDidHide'],
] as const)('en %s suma el alto del teclado (%s) y lo quita al ocultarse (%s)', async (so, mostrar, ocultar) => {
  fijarSO(so);
  await montar();
  expect(relleno()).toBe(14);

  await act(async () => oyentes.get(mostrar)?.(teclado(300)));
  expect(relleno()).toBe(14 + 300);

  await act(async () => oyentes.get(ocultar)?.(teclado(0)));
  expect(relleno()).toBe(14);
});

test('en web no hay teclado del sistema: no escucha nada', async () => {
  fijarSO('web');
  await montar();
  expect(oyentes.size).toBe(0);
});
