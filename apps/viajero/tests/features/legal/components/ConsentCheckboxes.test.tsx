import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ConsentCheckboxes } from '@/features/legal/components/ConsentCheckboxes';

import { renderConTema } from '../../../ui/support/conTema';

jest.mock('expo-router', () => require('../../../support/expo-router-falso'));

/** Casillas de autorización (Ley 1581): el aviso de error se alinea con el texto de las casillas. */

const MENSAJE = 'Debes aceptar ambos documentos para crear tu cuenta.';

async function abrir(props: { aceptaDatos?: boolean; aceptaTerminos?: boolean; mostrarError?: boolean } = {}) {
  await renderConTema(
    <ConsentCheckboxes
      aceptaDatos={props.aceptaDatos ?? false}
      aceptaTerminos={props.aceptaTerminos ?? false}
      mostrarError={props.mostrarError ?? false}
      onDatos={() => {}}
      onTerminos={() => {}}
    />,
  );
}

test('sin intento de envío no hay aviso', async () => {
  await abrir();
  expect(screen.queryByText(MENSAJE)).toBeNull();
});

test('el aviso empieza donde empieza el texto de las casillas (después del área de la casilla)', async () => {
  await abrir({ mostrarError: true });

  // El texto de cada fila arranca justo después del área táctil de la casilla.
  const areaCasilla = screen.getAllByTestId('casilla', { includeHiddenElements: true })[0]!.parent!;
  const anchoCasilla = StyleSheet.flatten(areaCasilla.props.style).width;
  expect(anchoCasilla).toBe(48);

  expect(StyleSheet.flatten(screen.getByText(MENSAJE).props.style).paddingLeft).toBe(anchoCasilla);
});

test('con las dos casillas marcadas el aviso desaparece', async () => {
  await abrir({ mostrarError: true, aceptaDatos: true, aceptaTerminos: true });
  expect(screen.queryByText(MENSAJE)).toBeNull();
});
