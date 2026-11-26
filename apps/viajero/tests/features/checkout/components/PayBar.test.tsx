import { act, screen } from '@testing-library/react-native';
import { Keyboard, Platform, StyleSheet, type KeyboardEvent } from 'react-native';

import { PayBar } from '@/features/checkout/components/PayBar';

import { renderWithTheme } from '../../../ui/support/render-with-theme';

/**
 * La barra de pagar sube con el teclado. En iOS llegan `keyboardWill*`; en Android SOLO
 * `keyboardDid*` (ver `Keyboard.js` de RN) y, con edge-to-edge (SDK 58), la ventana ya no se
 * achica: si la barra no suma el alto del teclado, queda tapada.
 */

type Listener = (e: KeyboardEvent) => void;

let listeners: Map<string, Listener>;
let originalOS: typeof Platform.OS;

function setOS(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

beforeEach(() => {
  listeners = new Map();
  originalOS = Platform.OS;
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, listener: Listener) => {
    listeners.set(event, listener);
    return { remove: () => listeners.delete(event) };
  }) as never);
});

afterEach(() => {
  setOS(originalOS);
  jest.restoreAllMocks();
});

const keyboardEvent = (height: number) => ({ endCoordinates: { height, screenX: 0, screenY: 0, width: 400 } }) as KeyboardEvent;

const bottomPadding = () => StyleSheet.flatten(screen.getByTestId('barra-pagar').props.style).paddingBottom;

async function renderBar() {
  await renderWithTheme(<PayBar total={190000} pax={2} processing={false} onPay={() => {}} />);
}

test.each([
  ['ios', 'keyboardWillShow', 'keyboardWillHide'],
  ['android', 'keyboardDidShow', 'keyboardDidHide'],
] as const)('en %s suma el alto del teclado (%s) y lo quita al ocultarse (%s)', async (os, showEvent, hideEvent) => {
  setOS(os);
  await renderBar();
  expect(bottomPadding()).toBe(14);

  await act(async () => listeners.get(showEvent)?.(keyboardEvent(300)));
  expect(bottomPadding()).toBe(14 + 300);

  await act(async () => listeners.get(hideEvent)?.(keyboardEvent(0)));
  expect(bottomPadding()).toBe(14);
});

test('en web no hay teclado del sistema: no escucha nada', async () => {
  setOS('web');
  await renderBar();
  expect(listeners.size).toBe(0);
});
