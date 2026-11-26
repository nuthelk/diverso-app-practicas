import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { CancellationPreview } from '@/core';
import { CancellationDialog } from '@/features/bookings/components/CancellationDialog';
import { lightTheme } from '@/ui/theme';

import { renderWithTheme } from '../../../ui/support/render-with-theme';
import { rawText } from '../../../support/raw-text';

/** Diálogo de cancelación con la política que aplica AHORA. Port 1:1 de `cancel_dialog_test.dart`. */

function previewOf({ applies, percentage, amount, reason = 'motivo del servidor' }: { applies: boolean; percentage: number; amount: number; reason?: string }) {
  return new CancellationPreview({ applies, percentage, amount, hoursBefore: 30, reason });
}

async function renderDialog(v: CancellationPreview, code = 'DIV-ABC123') {
  const onResult = jest.fn();
  await renderWithTheme(<CancellationDialog code={code} preview={v} onResult={onResult} />);
  return onResult;
}

test('100 %: dice que se devuelve todo y que es de prueba', async () => {
  await renderDialog(previewOf({ applies: true, percentage: 100, amount: 300000 }));
  expect(screen.getByText('¿Cancelar reserva?')).toBeOnTheScreen();
  expect(screen.getByText(/DIV-ABC123/)).toBeOnTheScreen();
  expect(screen.getByText(/te devolvemos el 100 % \(\$ 300\.000\)/)).toBeOnTheScreen();
  expect(screen.getByText(/reembolso de prueba/)).toBeOnTheScreen();
  expect(screen.getByText(/no se mueve dinero real/)).toBeOnTheScreen();
});

test('el porcentaje y el monto no se separan de su signo si la política se parte en líneas', async () => {
  await renderDialog(previewOf({ applies: true, percentage: 50, amount: 150000 }));
  expect(rawText(screen.getByText(/te devolvemos/))).toContain('el 50\u00A0% ($\u00A0150.000)');
});

test('50 %: muestra el porcentaje parcial y el monto', async () => {
  await renderDialog(previewOf({ applies: true, percentage: 50, amount: 150000 }));
  expect(screen.getByText(/te devolvemos el 50 % \(\$ 150\.000\)/)).toBeOnTheScreen();
  expect(screen.getByText(/política del plan/)).toBeOnTheScreen();
  expect(screen.queryByText(/100 %/)).toBeNull();
});

test('0 %: avisa que no hay reembolso y cita el motivo del servidor', async () => {
  await renderDialog(
    previewOf({ applies: false, percentage: 0, amount: 0, reason: 'Cancelación con menos de 24 h de anticipación: sin reembolso' }),
  );
  expect(screen.getByText(/no recibirás reembolso/)).toBeOnTheScreen();
  expect(screen.getByText(/Cancelación con menos de 24 h de anticipación: sin reembolso/)).toBeOnTheScreen();
  expect(screen.queryByText(/te devolvemos/)).toBeNull();
});

test('la política va en primary si aplica y en error si no', async () => {
  await renderDialog(previewOf({ applies: true, percentage: 100, amount: 1000 }));
  expect(StyleSheet.flatten(screen.getByText(/te devolvemos/).props.style).color).toBe(lightTheme.colorScheme.primary);

  await renderDialog(previewOf({ applies: false, percentage: 0, amount: 0 }));
  expect(StyleSheet.flatten(screen.getByText(/no recibirás/).props.style).color).toBe(lightTheme.colorScheme.error);
});

test('«Sí, cancelar» confirma y «Mantener» no', async () => {
  let onResult = await renderDialog(previewOf({ applies: true, percentage: 100, amount: 1000 }), 'DIV-1');
  await fireEvent.press(screen.getByText('Mantener'));
  expect(onResult).toHaveBeenCalledWith(false);

  onResult = await renderDialog(previewOf({ applies: true, percentage: 100, amount: 1000 }), 'DIV-1');
  await fireEvent.press(screen.getByText('Sí, cancelar'));
  expect(onResult).toHaveBeenCalledWith(true);
});
