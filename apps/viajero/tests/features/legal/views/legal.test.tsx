import { act, fireEvent, screen } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { useState } from 'react';

import { DocumentoLegal, VERSION_LEGAL } from '@/core';
import { ConsentimientoProvider } from '@/features/legal/view-models/ConsentimientoProvider';
import { ConsentCheckboxes } from '@/features/legal/components/ConsentCheckboxes';
import { ConsentView } from '@/features/legal/views/ConsentView';
import { AppRoutes } from '@/router';
import { LegalView } from '@/features/legal/views/LegalView';
import { temaClaro } from '@/ui/theme';

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

const pendientesDePrueba = ['tratamiento_datos', 'terminos_viajero'];

describe('ConsentCheckboxes', () => {
  function Casillas({ mostrarError = false }: { mostrarError?: boolean }) {
    const [datos, setDatos] = useState(false);
    const [terminos, setTerminos] = useState(false);
    return (
      <ConsentCheckboxes
        aceptaDatos={datos}
        aceptaTerminos={terminos}
        onDatos={setDatos}
        onTerminos={setTerminos}
        mostrarError={mostrarError}
      />
    );
  }

  test('nunca vienen marcadas y cada fila es una casilla accesible con su texto completo', async () => {
    await renderPantalla(<Casillas />);
    const [datos, terminos] = screen.getAllByRole('checkbox');
    expect(datos).not.toBeChecked();
    expect(terminos).not.toBeChecked();
    expect(datos).toHaveAccessibleName(
      'Autorizo de manera previa, expresa e informada el tratamiento de mis datos personales según la política de tratamiento de datos (Ley 1581 de 2012).',
    );
    expect(terminos).toHaveAccessibleName('Acepto los términos y condiciones.');
  });

  test('tocar la fila (casilla o texto) la alterna', async () => {
    await renderPantalla(<Casillas />);
    const [datos, terminos] = screen.getAllByRole('checkbox');
    await fireEvent.press(datos!);
    expect(screen.getAllByRole('checkbox')[0]).toBeChecked();
    await fireEvent.press(terminos!);
    await fireEvent.press(screen.getAllByRole('checkbox')[1]!);
    expect(screen.getAllByRole('checkbox')[1]).not.toBeChecked();
  });

  test('los enlaces abren la política de datos y los términos sin alternar la casilla', async () => {
    await renderPantalla(<Casillas />);
    await fireEvent.press(screen.getByText('política de tratamiento de datos'));
    await fireEvent.press(screen.getByText('términos y condiciones'));
    expect(routerFalso.push.mock.calls).toEqual([['/legal/privacidad'], ['/legal/terminos-viajeros']]);
    for (const casilla of screen.getAllByRole('checkbox')) expect(casilla).not.toBeChecked();
  });

  test('los enlaces en primary, w700 y subrayados', async () => {
    await renderPantalla(<Casillas />);
    const s = screen.getByText('términos y condiciones').props.style;
    expect(s).toMatchObject({ color: temaClaro.colorScheme.primary, fontWeight: '700', textDecorationLine: 'underline' });
  });

  test('con mostrarError y alguna sin marcar avisa (y deja de avisar al marcar las dos)', async () => {
    await renderPantalla(<Casillas mostrarError />);
    expect(screen.getByText('Debes aceptar ambos documentos para crear tu cuenta.')).toBeOnTheScreen();
    for (const casilla of screen.getAllByRole('checkbox')) await fireEvent.press(casilla);
    expect(screen.queryByText('Debes aceptar ambos documentos para crear tu cuenta.')).toBeNull();
  });
});

describe('ConsentView', () => {
  async function abrir(auth: AuthFalso) {
    const r = await renderPantalla(
      <ConsentimientoProvider>
        <ConsentView />
      </ConsentimientoProvider>,
      { dependencias: dependenciasDePrueba({ auth }) },
    );
    await act(esperar);
    return r;
  }

  test('pide la autorización con el formulario si hay documentos pendientes', async () => {
    await abrir(new AuthFalso({ consultas: [pendientesDePrueba] }));
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
    jest.spyOn(auth, 'consentimientosPendientes').mockReturnValue(new Promise(() => {}));
    await abrir(auth);
    expect(screen.getByTestId('consentimiento-verificando')).toBeOnTheScreen();
    expect(screen.queryByText('Aceptar y continuar')).toBeNull();
  });

  test('si la consulta falló: aviso y «Reintentar», sin formulario', async () => {
    const auth = new AuthFalso({ consultas: [new Error('sin red'), pendientesDePrueba] });
    await abrir(auth);
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
    const auth = new AuthFalso({ consultas: [pendientesDePrueba] });
    await abrir(auth);
    await fireEvent.press(screen.getByText('Aceptar y continuar'));
    expect(auth.registrados).toEqual([]);
    expect(screen.getByText('Debes aceptar ambos documentos para crear tu cuenta.')).toBeOnTheScreen();
  });

  test('aceptar registra los documentos pendientes', async () => {
    const auth = new AuthFalso({ consultas: [pendientesDePrueba, []] });
    await abrir(auth);
    for (const casilla of screen.getAllByRole('checkbox')) await fireEvent.press(casilla);
    await fireEvent.press(screen.getByText('Aceptar y continuar'));
    await act(esperar);
    expect(auth.registrados).toEqual(pendientesDePrueba);
  });

  test('si no se puede guardar avisa y se queda', async () => {
    const auth = new AuthFalso({ consultas: [pendientesDePrueba] });
    auth.falloAlRegistrar = true;
    await abrir(auth);
    for (const casilla of screen.getAllByRole('checkbox')) await fireEvent.press(casilla);
    await fireEvent.press(screen.getByText('Aceptar y continuar'));
    await act(esperar);
    expect(screen.getByText('No pudimos guardar tu autorización. Intenta de nuevo.')).toBeOnTheScreen();
    expect(screen.getByText('Antes de continuar')).toBeOnTheScreen();
  });

  test('«Cerrar sesión» cierra la sesión', async () => {
    const auth = new AuthFalso({ consultas: [pendientesDePrueba] });
    await abrir(auth);
    await fireEvent.press(screen.getByText('Cerrar sesión'));
    expect(await auth.currentUserId()).toBeNull();
  });

  test('no se puede salir con el botón atrás de Android (PopScope canPop: false)', async () => {
    type Escucha = Parameters<typeof BackHandler.addEventListener>[1];
    const escuchas: Escucha[] = [];
    const espia = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_evento, escucha) => {
      escuchas.push(escucha);
      return { remove: () => escuchas.splice(escuchas.indexOf(escucha), 1) };
    });
    const { unmount } = await abrir(new AuthFalso({ consultas: [pendientesDePrueba] }));

    expect(escuchas).toHaveLength(1);
    expect((escuchas[0] as (...args: unknown[]) => unknown)({})).toBe(true);

    await unmount();
    expect(escuchas).toHaveLength(0);
    espia.mockRestore();
  });
});

describe('LegalView', () => {
  test('muestra versión, título, resumen, aviso de borrador y secciones con encabezados semánticos', async () => {
    await renderPantalla(<LegalView docId="privacidad" />);
    const doc = DocumentoLegal.porId('privacidad')!;

    expect(screen.getByText('Documentos legales')).toBeOnTheScreen();
    expect(screen.getByText(`VERSIÓN ${VERSION_LEGAL.toUpperCase()}`)).toBeOnTheScreen();
    expect(screen.getByText(doc.titulo)).toBeOnTheScreen();
    expect(screen.getByText(doc.resumen)).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Borrador para el piloto académico: debe revisarlo un abogado y completarse con los datos del responsable antes del lanzamiento comercial.',
      ),
    ).toBeOnTheScreen();
    for (const seccion of doc.secciones) {
      expect(screen.getByRole('header', { name: seccion.titulo })).toBeOnTheScreen();
      for (const parrafo of seccion.parrafos) expect(screen.getByText(parrafo)).toBeOnTheScreen();
    }
  });

  test('el texto es seleccionable (SelectionArea)', async () => {
    await renderPantalla(<LegalView docId="terminos-viajeros" />);
    const doc = DocumentoLegal.porId('terminos-viajeros')!;
    expect(screen.getByText(doc.titulo).props.selectable).toBe(true);
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
