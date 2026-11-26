import { fireEvent, screen } from 'expo-router/testing-library';
import { act } from '@testing-library/react-native';
import { Keyboard, Platform, StyleSheet, type KeyboardEvent } from 'react-native';

import { BookingStatus, DiversoError, ExperienceCategory, Plan, PlanStatus } from '@/core';
import { hideSnackbar } from '@/features/shared/snackbar';
import { forgetPreloadedBooking } from '@/features/bookings/between-screens';

import { arrancarApp, asentar } from '../../../support/app';
import { dependenciasDePrueba } from '../../../support/dependencias-de-prueba';
import { PublicadorDeResenasFalso, ReservasFalsas, reservaDePrueba } from '../../../support/reservas-falsas';

/**
 * Reseña (`/resena/:bookingId`): elegir estrellas, publicar y los avisos cuando el servidor la
 * rechaza (port de `review_view_test.dart`); la carga por id, la reserva no reseñable y el regreso
 * a «Mis reservas» (grupo `/resena/:bookingId` de `router/rutas_con_ids_test.dart`). Con el router
 * real. Sin red ni Supabase.
 */

afterEach(() => {
  hideSnackbar();
  forgetPreloadedBooking();
});

const DAY_MS = 24 * 60 * 60 * 1000;
const planP1 = new Plan({
  id: 'p1',
  agencyId: 'ag',
  title: 'Plan p1',
  destination: 'Guatapé',
  category: ExperienceCategory.adventure,
  priceCop: 150000,
  status: PlanStatus.published,
});

async function openReview({
  url = '/resena/res-1',
  publishFailure = null,
  hasDeparted = true,
  status = BookingStatus.confirmed,
}: { url?: string; publishFailure?: unknown; hasDeparted?: boolean; status?: BookingStatus } = {}) {
  const bookings = new ReservasFalsas([
    reservaDePrueba({ salida: new Date(Date.now() + (hasDeparted ? -4 : 4) * DAY_MS), plan: planP1, estado: status }),
  ]);
  const reviews = new PublicadorDeResenasFalso();
  reviews.fallo = publishFailure;
  const r = await arrancarApp(url, dependenciasDePrueba({ bookings, reviews }));
  return { r, bookings, reviews };
}

async function tap(text: string) {
  await fireEvent.press(screen.getByText(text));
  await asentar();
}

const publishButton = () => screen.getByRole('button', { name: 'Publicar reseña' });

describe('formulario', () => {
  test('muestra el formulario con 5 estrellas', async () => {
    await openReview();

    expect(screen.getByText('Tu reseña')).toBeOnTheScreen();
    expect(screen.getByText('¡Excelente!')).toBeOnTheScreen();
    expect(screen.getByText('¿Cómo estuvo tu experiencia?')).toBeOnTheScreen();
    expect(screen.getByText('Reseña verificada: solo quien viajó puede opinar')).toBeOnTheScreen();
    expect(publishButton()).toBeOnTheScreen();
    for (let i = 1; i <= 5; i++) expect(screen.getByLabelText(`${i} de 5 estrellas`)).toBeOnTheScreen();
  });

  test('elegir estrellas cambia la etiqueta y la calificación que se publica', async () => {
    const { reviews } = await openReview({ publishFailure: new DiversoError('ESTADO_INVALIDO') });

    await fireEvent.press(screen.getByLabelText('3 de 5 estrellas'));
    await asentar();
    expect(screen.getByText('Regular')).toBeOnTheScreen();

    for (const [n, label] of [
      [1, 'Muy mala'],
      [2, 'Mala'],
      [4, 'Buena'],
      [5, '¡Excelente!'],
    ] as const) {
      await fireEvent.press(screen.getByLabelText(`${n} de 5 estrellas`));
      await asentar();
      expect(screen.getByText(label)).toBeOnTheScreen();
    }

    await fireEvent.changeText(screen.getByLabelText('Cuenta cómo te fue (opcional)'), 'Buen paseo');
    await tap('Publicar reseña');

    expect(reviews.creadas).toEqual([]); // el servidor la rechazó
  });

  test('si el servidor rechaza la reseña lo explica y deja volver a intentarlo', async () => {
    const { r } = await openReview({ publishFailure: new DiversoError('ESTADO_INVALIDO') });

    await tap('Publicar reseña');

    expect(screen.getByText('La reserva ya no admite esta operación.')).toBeOnTheScreen();
    expect(publishButton()).toBeEnabled();
    expect(screen.getByText('Tu reseña')).toBeOnTheScreen(); // no sale de la pantalla
    expect(r.getPathname()).toBe('/resena/res-1');
  });

  test('publicada: agradece y se envía con la calificación elegida', async () => {
    const { reviews } = await openReview();

    await fireEvent.press(screen.getByLabelText('4 de 5 estrellas'));
    await asentar();
    await fireEvent.changeText(screen.getByLabelText('Cuenta cómo te fue (opcional)'), 'Muy bueno');
    await tap('Publicar reseña');

    expect(reviews.creadas).toEqual([{ bookingId: 'res-1', calificacion: 4, comentario: 'Muy bueno' }]);
    expect(screen.getByText('¡Gracias! Tu reseña ayudará a otros viajeros.')).toBeOnTheScreen();
  });

  test('el comentario admite hasta 500 caracteres con contador', async () => {
    await openReview();

    expect(screen.getByLabelText('Cuenta cómo te fue (opcional)')).toHaveProp('maxLength', 500);
    expect(screen.getByText('0/500')).toBeOnTheScreen();
  });
});

describe('/resena/:bookingId', () => {
  test('tras una recarga (solo la URL, sin extra) carga la reserva y muestra el formulario', async () => {
    const { bookings } = await openReview();

    expect(bookings.consultas).toEqual(['res-1']);
    expect(screen.getByText('Tu reseña')).toBeOnTheScreen();
    expect(screen.getByText('Plan p1')).toBeOnTheScreen();
    expect(publishButton()).toBeOnTheScreen();
  });

  test('publicar la reseña desde una URL abierta directo vuelve a «Mis reservas»', async () => {
    const { r, reviews } = await openReview();

    await tap('Publicar reseña');

    expect(reviews.creadas).toEqual([{ bookingId: 'res-1', calificacion: 5, comentario: '' }]);
    expect(r.getPathname()).toBe('/reservas');
    // El aviso sobrevive a la navegación (el `ScaffoldMessenger` de Flutter es de toda la app).
    expect(screen.getByText('¡Gracias! Tu reseña ayudará a otros viajeros.')).toBeOnTheScreen();
  });

  test('una reserva que aún no viajó no se puede reseñar', async () => {
    await openReview({ hasDeparted: false });
    expect(screen.getByText('Esta reserva no se puede reseñar')).toBeOnTheScreen();
    expect(screen.getByText('Solo se reseñan los viajes ya realizados que aún no tienen reseña.')).toBeOnTheScreen();
    expect(screen.queryByText('Publicar reseña')).toBeNull();
  });

  test('«Ver mis reservas» desde una reserva no reseñable lleva a la lista', async () => {
    const { r } = await openReview({ status: BookingStatus.cancelled });

    await tap('Ver mis reservas');

    expect(r.getPathname()).toBe('/reservas');
  });

  test('una reserva inexistente muestra el error, no una pantalla vacía', async () => {
    await openReview({ url: '/resena/nope' });
    expect(screen.getByText('No pudimos cargar la reserva')).toBeOnTheScreen();
    expect(screen.getByText('Reintentar')).toBeOnTheScreen();
    expect(screen.getByText('Ver mis reservas')).toBeOnTheScreen();
    expect(screen.queryByText('Publicar reseña')).toBeNull();
  });

  test('desde «Mis reservas», la reserva adelantada evita volver a pedirla', async () => {
    const { r, bookings } = await openReview({ url: '/reservas' });
    await tap('Historial (1)');

    await tap('Reseñar');

    expect(r.getPathname()).toBe('/resena/res-1');
    expect(publishButton()).toBeOnTheScreen();
    expect(bookings.consultas).toEqual([]);
  });

  test('al volver de la reseña «Mis reservas» se recarga', async () => {
    const { r, bookings } = await openReview({ url: '/reservas' });
    await tap('Historial (1)');
    expect(bookings.consultasLista).toBe(1);

    await tap('Reseñar');
    await tap('Publicar reseña');

    expect(r.getPathname()).toBe('/reservas');
    expect(bookings.consultasLista).toBe(2);
  });

  test('la ruta vieja /resena (sin id) lleva a «Mis reservas»', async () => {
    const { r } = await openReview({ url: '/resena' });
    expect(r.getPathname()).toBe('/reservas');
  });
});

describe('teclado', () => {
  // SDK 58: Android es edge-to-edge y la ventana NO se achica con el teclado. Sin `padding` el
  // teclado tapaba el comentario y «Publicar reseña». iOS emite `keyboardWill*`; Android, SOLO
  // `keyboardDid*` (y a esos escucha el KeyboardAvoidingView en cada plataforma).
  test.each([
    ['ios', 'keyboardWillShow'],
    ['android', 'keyboardDidShow'],
  ] as const)('en %s el formulario deja lugar al teclado (padding abajo)', async (os, event) => {
    const originalOS = Platform.OS;
    const listeners = new Map<string, ((e: KeyboardEvent) => void)[]>();
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((name: string, listener: (e: KeyboardEvent) => void) => {
      listeners.set(name, [...(listeners.get(name) ?? []), listener]);
      return { remove: () => {} };
    }) as never);
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
    try {
      await openReview();
      const container = screen.getByTestId('resena-teclado');
      // Ocupa toda la ventana (0..800) y el teclado empieza en y = 500: tapa 300 px.
      await fireEvent(container, 'layout', {
        persist: () => {},
        nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } },
      });
      await act(async () => {
        for (const listener of listeners.get(event) ?? []) {
          listener({ endCoordinates: { screenX: 0, screenY: 500, width: 400, height: 300 } } as KeyboardEvent);
        }
      });

      expect(StyleSheet.flatten(screen.getByTestId('resena-teclado').props.style).paddingBottom).toBe(300);
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => originalOS });
      jest.restoreAllMocks();
    }
  });
});

test('abierta en frío (sin historial), «Volver» lleva a Mis reservas en vez de dejarla sin salida', async () => {
  const { r } = await openReview();
  await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
  await asentar();
  expect(r.getPathname()).toBe('/reservas');
});
