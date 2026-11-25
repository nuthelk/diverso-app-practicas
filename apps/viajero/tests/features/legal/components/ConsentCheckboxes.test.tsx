import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ConsentCheckboxes } from '@/features/legal/components/ConsentCheckboxes';

import { renderWithTheme } from '../../../ui/support/render-with-theme';

jest.mock('expo-router', () => require('../../../support/expo-router-falso'));

/** Casillas de autorización (Ley 1581): el aviso de error se alinea con el texto de las casillas. */

const MESSAGE = 'Debes aceptar ambos documentos para crear tu cuenta.';

async function renderCheckboxes(props: { acceptsDataPolicy?: boolean; acceptsTerms?: boolean; showError?: boolean } = {}) {
  await renderWithTheme(
    <ConsentCheckboxes
      acceptsDataPolicy={props.acceptsDataPolicy ?? false}
      acceptsTerms={props.acceptsTerms ?? false}
      showError={props.showError ?? false}
      onDataPolicyChange={() => {}}
      onTermsChange={() => {}}
    />,
  );
}

test('sin intento de envío no hay aviso', async () => {
  await renderCheckboxes();
  expect(screen.queryByText(MESSAGE)).toBeNull();
});

test('el aviso empieza donde empieza el texto de las casillas (después del área de la casilla)', async () => {
  await renderCheckboxes({ showError: true });

  // El texto de cada fila arranca justo después del área táctil de la casilla.
  const checkboxArea = screen.getAllByTestId('casilla', { includeHiddenElements: true })[0]!.parent!;
  const checkboxWidth = StyleSheet.flatten(checkboxArea.props.style).width;
  expect(checkboxWidth).toBe(48);

  expect(StyleSheet.flatten(screen.getByText(MESSAGE).props.style).paddingLeft).toBe(checkboxWidth);
});

test('con las dos casillas marcadas el aviso desaparece', async () => {
  await renderCheckboxes({ showError: true, acceptsDataPolicy: true, acceptsTerms: true });
  expect(screen.queryByText(MESSAGE)).toBeNull();
});
