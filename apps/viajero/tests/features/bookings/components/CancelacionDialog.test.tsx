import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { VistaPreviaCancelacion } from '@/core';
import { CancelacionDialog } from '@/features/bookings/components/CancelacionDialog';
import { temaClaro } from '@/ui/theme';

import { renderConTema } from '../../../ui/support/conTema';
import { textoCrudo } from '../../../support/texto-crudo';

/** Diálogo de cancelación con la política que aplica AHORA. Port 1:1 de `cancel_dialog_test.dart`. */

function vista({ aplica, porcentaje, monto, motivo = 'motivo del servidor' }: { aplica: boolean; porcentaje: number; monto: number; motivo?: string }) {
  return new VistaPreviaCancelacion({ aplica, porcentaje, monto, horasAntes: 30, motivo });
}

async function abrir(v: VistaPreviaCancelacion, codigo = 'DIV-ABC123') {
  const onResultado = jest.fn();
  await renderConTema(<CancelacionDialog codigo={codigo} vista={v} onResultado={onResultado} />);
  return onResultado;
}

test('100 %: dice que se devuelve todo y que es de prueba', async () => {
  await abrir(vista({ aplica: true, porcentaje: 100, monto: 300000 }));
  expect(screen.getByText('¿Cancelar reserva?')).toBeOnTheScreen();
  expect(screen.getByText(/DIV-ABC123/)).toBeOnTheScreen();
  expect(screen.getByText(/te devolvemos el 100 % \(\$ 300\.000\)/)).toBeOnTheScreen();
  expect(screen.getByText(/reembolso de prueba/)).toBeOnTheScreen();
  expect(screen.getByText(/no se mueve dinero real/)).toBeOnTheScreen();
});

test('el porcentaje y el monto no se separan de su signo si la política se parte en líneas', async () => {
  await abrir(vista({ aplica: true, porcentaje: 50, monto: 150000 }));
  expect(textoCrudo(screen.getByText(/te devolvemos/))).toContain('el 50\u00A0% ($\u00A0150.000)');
});

test('50 %: muestra el porcentaje parcial y el monto', async () => {
  await abrir(vista({ aplica: true, porcentaje: 50, monto: 150000 }));
  expect(screen.getByText(/te devolvemos el 50 % \(\$ 150\.000\)/)).toBeOnTheScreen();
  expect(screen.getByText(/política del plan/)).toBeOnTheScreen();
  expect(screen.queryByText(/100 %/)).toBeNull();
});

test('0 %: avisa que no hay reembolso y cita el motivo del servidor', async () => {
  await abrir(
    vista({ aplica: false, porcentaje: 0, monto: 0, motivo: 'Cancelación con menos de 24 h de anticipación: sin reembolso' }),
  );
  expect(screen.getByText(/no recibirás reembolso/)).toBeOnTheScreen();
  expect(screen.getByText(/Cancelación con menos de 24 h de anticipación: sin reembolso/)).toBeOnTheScreen();
  expect(screen.queryByText(/te devolvemos/)).toBeNull();
});

test('la política va en primary si aplica y en error si no', async () => {
  await abrir(vista({ aplica: true, porcentaje: 100, monto: 1000 }));
  expect(StyleSheet.flatten(screen.getByText(/te devolvemos/).props.style).color).toBe(temaClaro.colorScheme.primary);

  await abrir(vista({ aplica: false, porcentaje: 0, monto: 0 }));
  expect(StyleSheet.flatten(screen.getByText(/no recibirás/).props.style).color).toBe(temaClaro.colorScheme.error);
});

test('«Sí, cancelar» confirma y «Mantener» no', async () => {
  let onResultado = await abrir(vista({ aplica: true, porcentaje: 100, monto: 1000 }), 'DIV-1');
  await fireEvent.press(screen.getByText('Mantener'));
  expect(onResultado).toHaveBeenCalledWith(false);

  onResultado = await abrir(vista({ aplica: true, porcentaje: 100, monto: 1000 }), 'DIV-1');
  await fireEvent.press(screen.getByText('Sí, cancelar'));
  expect(onResultado).toHaveBeenCalledWith(true);
});
