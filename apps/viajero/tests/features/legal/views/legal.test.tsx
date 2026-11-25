import { act, fireEvent, screen } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { useState } from 'react';

import { LegalDocument, LEGAL_VERSION } from '@/core';
import { ConsentProvider } from '@/features/legal/view-models/ConsentProvider';
import { ConsentCheckboxes } from '@/features/legal/components/ConsentCheckboxes';
import { ConsentView } from '@/features/legal/views/ConsentView';
import { AppRoutes } from '@/router';
import { LegalView } from '@/features/legal/views/LegalView';
import { lightTheme } from '@/ui/theme';

import { AuthFalso } from '../../../support/auth-falso';
import { esperar } from '../../../support/compuerta';
import { dependenciasDePrueba } from '../../../support/dependencias-de-prueba';
import { reiniciarRouterFalso, routerFalso } from '../../../support/expo-router-falso';
import { renderPantalla } from '../../../support/pantalla';

jest.mock('expo-router', () => require('../../../support/expo-router-falso'));

/**
 * Pantallas legales (Ley 1581 de 2012): las casillas de autorización (compartidas por registro y
 * consentimiento), la pantalla de consentimiento y la lectura de un documento.
 */

beforeEach(reiniciarRouterFalso);

const testPendingDocuments = ['tratamiento_datos', 'terminos_viajero'];

describe('ConsentCheckboxes', () => {
  function Checkboxes({ showError = false }: { showError?: boolean }) {
    const [dataPolicy, setDataPolicy] = useState(false);
    const [terms, setTerms] = useState(false);
    return (
      <ConsentCheckboxes
        acceptsDataPolicy={dataPolicy}
        acceptsTerms={terms}
        onDataPolicyChange={setDataPolicy}
        onTermsChange={setTerms}
        showError={showError}
      />
    );
  }

  test('nunca vienen marcadas y cada fila es una casilla accesible con su texto completo', async () => {
    await renderPantalla(<Checkboxes />);
    const [dataPolicy, terms] = screen.getAllByRole('checkbox');
    expect(dataPolicy).not.toBeChecked();
    expect(terms).not.toBeChecked();
    expect(dataPolicy).toHaveAccessibleName(
      'Autorizo de manera previa, expresa e informada el tratamiento de mis datos personales según la política de tratamiento de datos (Ley 1581 de 2012).',
    );
    expect(terms).toHaveAccessibleName('Acepto los términos y condiciones.');
  });

  test('tocar la fila (casilla o texto) la alterna', async () => {
    await renderPantalla(<Checkboxes />);
    const [dataPolicy, terms] = screen.getAllByRole('checkbox');
    await fireEvent.press(dataPolicy!);
    expect(screen.getAllByRole('checkbox')[0]).toBeChecked();
    await fireEvent.press(terms!);
    await fireEvent.press(screen.getAllByRole('checkbox')[1]!);
    expect(screen.getAllByRole('checkbox')[1]).not.toBeChecked();
  });

  test('los enlaces abren la política de datos y los términos sin alternar la casilla', async () => {
    await renderPantalla(<Checkboxes />);
    await fireEvent.press(screen.getByText('política de tratamiento de datos'));
    await fireEvent.press(screen.getByText('términos y condiciones'));
    expect(routerFalso.push.mock.calls).toEqual([['/legal/privacidad'], ['/legal/terminos-viajeros']]);
    for (const checkbox of screen.getAllByRole('checkbox')) expect(checkbox).not.toBeChecked();
  });

  test('los enlaces en primary, w700 y subrayados', async () => {
    await renderPantalla(<Checkboxes />);
    const s = screen.getByText('términos y condiciones').props.style;
    expect(s).toMatchObject({ color: lightTheme.colorScheme.primary, fontWeight: '700', textDecorationLine: 'underline' });
  });

  test('con mostrarError y alguna sin marcar avisa (y deja de avisar al marcar las dos)', async () => {
    await renderPantalla(<Checkboxes showError />);
    expect(screen.getByText('Debes aceptar ambos documentos para crear tu cuenta.')).toBeOnTheScreen();
    for (const checkbox of screen.getAllByRole('checkbox')) await fireEvent.press(checkbox);
    expect(screen.queryByText('Debes aceptar ambos documentos para crear tu cuenta.')).toBeNull();
  });
});

describe('ConsentView', () => {
  async function renderConsent(auth: AuthFalso) {
    const r = await renderPantalla(
      <ConsentProvider>
        <ConsentView />
      </ConsentProvider>,
      { dependencias: dependenciasDePrueba({ auth }) },
    );
    await act(esperar);
    return r;
  }

  test('pide la autorización con el formulario si hay documentos pendientes', async () => {
    await renderConsent(new AuthFalso({ consultas: [testPendingDocuments] }));
    expect(screen.getByText('Antes de continuar')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Actualizamos nuestros documentos legales. Necesitamos tu autorización expresa para seguir gestionando tu cuenta y tus reservas.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    expect(screen.getByText('Aceptar y continuar')).toBeOnTheScreen();
    expect(screen.getByText('Cerrar sesión')).toBeOnTheScreen();
  });

  test('mientras se verifica muestra un indicador y no el formulario', async () => {
    const auth = new AuthFalso();
    jest.spyOn(auth, 'pendingConsents').mockReturnValue(new Promise(() => {}));
    await renderConsent(auth);
    expect(screen.getByTestId('consentimiento-verificando')).toBeOnTheScreen();
    expect(screen.queryByText('Aceptar y continuar')).toBeNull();
  });

  test('si la consulta falló: aviso y «Reintentar», sin formulario', async () => {
    const auth = new AuthFalso({ consultas: [new Error('sin red'), testPendingDocuments] });
    await renderConsent(auth);
    expect(
      screen.getByText('No pudimos verificar tu autorización. Revisa tu conexión e intenta de nuevo.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Aceptar y continuar')).toBeNull();

    await fireEvent.press(screen.getByText('Reintentar'));
    await act(esperar);

    expect(auth.consultas).toBe(2);
    expect(screen.getByText('Aceptar y continuar')).toBeOnTheScreen();
  });

  test('sin las dos casillas «Aceptar y continuar» no guarda y las resalta', async () => {
    const auth = new AuthFalso({ consultas: [testPendingDocuments] });
    await renderConsent(auth);
    await fireEvent.press(screen.getByText('Aceptar y continuar'));
    expect(auth.registrados).toEqual([]);
    expect(screen.getByText('Debes aceptar ambos documentos para crear tu cuenta.')).toBeOnTheScreen();
  });

  test('aceptar registra los documentos pendientes', async () => {
    const auth = new AuthFalso({ consultas: [testPendingDocuments, []] });
    await renderConsent(auth);
    for (const checkbox of screen.getAllByRole('checkbox')) await fireEvent.press(checkbox);
    await fireEvent.press(screen.getByText('Aceptar y continuar'));
    await act(esperar);
    expect(auth.registrados).toEqual(testPendingDocuments);
  });

  test('si no se puede guardar avisa y se queda', async () => {
    const auth = new AuthFalso({ consultas: [testPendingDocuments] });
    auth.falloAlRegistrar = true;
    await renderConsent(auth);
    for (const checkbox of screen.getAllByRole('checkbox')) await fireEvent.press(checkbox);
    await fireEvent.press(screen.getByText('Aceptar y continuar'));
    await act(esperar);
    expect(screen.getByText('No pudimos guardar tu autorización. Intenta de nuevo.')).toBeOnTheScreen();
    expect(screen.getByText('Antes de continuar')).toBeOnTheScreen();
  });

  test('«Cerrar sesión» cierra la sesión', async () => {
    const auth = new AuthFalso({ consultas: [testPendingDocuments] });
    await renderConsent(auth);
    await fireEvent.press(screen.getByText('Cerrar sesión'));
    expect(await auth.currentUserId()).toBeNull();
  });

  test('no se puede salir con el botón atrás de Android (PopScope canPop: false)', async () => {
    type Listener = Parameters<typeof BackHandler.addEventListener>[1];
    const listeners: Listener[] = [];
    const spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, listener) => {
      listeners.push(listener);
      return { remove: () => listeners.splice(listeners.indexOf(listener), 1) };
    });
    const { unmount } = await renderConsent(new AuthFalso({ consultas: [testPendingDocuments] }));

    expect(listeners).toHaveLength(1);
    expect((listeners[0] as (...args: unknown[]) => unknown)({})).toBe(true);

    await unmount();
    expect(listeners).toHaveLength(0);
    spy.mockRestore();
  });
});

describe('LegalView', () => {
  test('muestra versión, título, resumen, aviso de borrador y secciones con encabezados semánticos', async () => {
    await renderPantalla(<LegalView docId="privacidad" />);
    const doc = LegalDocument.byId('privacidad')!;

    expect(screen.getByText('Documentos legales')).toBeOnTheScreen();
    expect(screen.getByText(`VERSIÓN ${LEGAL_VERSION.toUpperCase()}`)).toBeOnTheScreen();
    expect(screen.getByText(doc.title)).toBeOnTheScreen();
    expect(screen.getByText(doc.summary)).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Borrador para el piloto académico: debe revisarlo un abogado y completarse con los datos del responsable antes del lanzamiento comercial.',
      ),
    ).toBeOnTheScreen();
    for (const section of doc.sections) {
      expect(screen.getByRole('header', { name: section.title })).toBeOnTheScreen();
      for (const paragraph of section.paragraphs) expect(screen.getByText(paragraph)).toBeOnTheScreen();
    }
  });

  test('el texto es seleccionable (SelectionArea)', async () => {
    await renderPantalla(<LegalView docId="terminos-viajeros" />);
    const doc = LegalDocument.byId('terminos-viajeros')!;
    expect(screen.getByText(doc.title).props.selectable).toBe(true);
  });

  test('un documento inexistente avisa', async () => {
    await renderPantalla(<LegalView docId="no-existe" />);
    expect(screen.getByText('Documento no encontrado.')).toBeOnTheScreen();
  });

  test('sin historial (recarga o enlace directo), «Volver» lleva al inicio: el guard decide si es el login', async () => {
    await renderPantalla(<LegalView docId="privacidad" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(routerFalso.replace).toHaveBeenCalledWith(AppRoutes.explorar);
  });

  test('con historial, «Volver» vuelve atrás', async () => {
    routerFalso.canGoBack.mockImplementation(() => true);
    await renderPantalla(<LegalView docId="privacidad" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(routerFalso.back).toHaveBeenCalled();
  });
});
