import { fireEvent, screen } from 'expo-router/testing-library';
import { act } from '@testing-library/react-native';
import { Keyboard, Platform, StyleSheet, type KeyboardEvent } from 'react-native';

import { BookingStatus, DiversoError, ExperienceCategory, Plan, PlanStatus } from '@/core';
import { ocultarAviso } from '@/features/compartido/aviso-flotante';
import { olvidarReservaAdelantada } from '@/features/bookings/paso-entre-pantallas';

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
  ocultarAviso();
  olvidarReservaAdelantada();
});

const DIA = 24 * 60 * 60 * 1000;
const planP1 = new Plan({
  id: 'p1',
  agencyId: 'ag',
  titulo: 'Plan p1',
  destino: 'Guatapé',
  categoria: ExperienceCategory.aventura,
  precioCop: 150000,
  estado: PlanStatus.publicado,
});

async function abrir({
  url = '/resena/res-1',
  falloAlPublicar = null,
  yaSalio = true,
  estado = BookingStatus.confirmada,
}: { url?: string; falloAlPublicar?: unknown; yaSalio?: boolean; estado?: BookingStatus } = {}) {
  const reservas = new ReservasFalsas([
    reservaDePrueba({ salida: new Date(Date.now() + (yaSalio ? -4 : 4) * DIA), plan: planP1, estado }),
  ]);
  const resenas = new PublicadorDeResenasFalso();
  resenas.fallo = falloAlPublicar;
  const r = await arrancarApp(url, dependenciasDePrueba({ reservas, resenas }));
  return { r, reservas, resenas };
}

async function tocar(texto: string) {
  await fireEvent.press(screen.getByText(texto));
  await asentar();
}

const publicar = () => screen.getByRole('button', { name: 'Publicar reseña' });

describe('formulario', () => {
  test('muestra el formulario con 5 estrellas', async () => {
    await abrir();

    expect(screen.getByText('Tu reseña')).toBeOnTheScreen();
    expect(screen.getByText('¡Excelente!')).toBeOnTheScreen();
    expect(screen.getByText('¿Cómo estuvo tu experiencia?')).toBeOnTheScreen();
    expect(screen.getByText('Reseña verificada: solo quien viajó puede opinar')).toBeOnTheScreen();
    expect(publicar()).toBeOnTheScreen();
    for (let i = 1; i <= 5; i++) expect(screen.getByLabelText(`${i} de 5 estrellas`)).toBeOnTheScreen();
  });

  test('elegir estrellas cambia la etiqueta y la calificación que se publica', async () => {
    const { resenas } = await abrir({ falloAlPublicar: new DiversoError('ESTADO_INVALIDO') });

    await fireEvent.press(screen.getByLabelText('3 de 5 estrellas'));
    await asentar();
    expect(screen.getByText('Regular')).toBeOnTheScreen();

    for (const [n, etiqueta] of [
      [1, 'Muy mala'],
      [2, 'Mala'],
      [4, 'Buena'],
      [5, '¡Excelente!'],
    ] as const) {
      await fireEvent.press(screen.getByLabelText(`${n} de 5 estrellas`));
      await asentar();
      expect(screen.getByText(etiqueta)).toBeOnTheScreen();
    }

    await fireEvent.changeText(screen.getByLabelText('Cuenta cómo te fue (opcional)'), 'Buen paseo');
    await tocar('Publicar reseña');

    expect(resenas.creadas).toEqual([]); // el servidor la rechazó
  });

  test('si el servidor rechaza la reseña lo explica y deja volver a intentarlo', async () => {
    const { r } = await abrir({ falloAlPublicar: new DiversoError('ESTADO_INVALIDO') });

    await tocar('Publicar reseña');

    expect(screen.getByText('La reserva ya no admite esta operación.')).toBeOnTheScreen();
    expect(publicar()).toBeEnabled();
    expect(screen.getByText('Tu reseña')).toBeOnTheScreen(); // no sale de la pantalla
    expect(r.getPathname()).toBe('/resena/res-1');
  });

  test('publicada: agradece y se envía con la calificación elegida', async () => {
    const { resenas } = await abrir();

    await fireEvent.press(screen.getByLabelText('4 de 5 estrellas'));
    await asentar();
    await fireEvent.changeText(screen.getByLabelText('Cuenta cómo te fue (opcional)'), 'Muy bueno');
    await tocar('Publicar reseña');

    expect(resenas.creadas).toEqual([{ bookingId: 'res-1', calificacion: 4, comentario: 'Muy bueno' }]);
    expect(screen.getByText('¡Gracias! Tu reseña ayudará a otros viajeros.')).toBeOnTheScreen();
  });

  test('el comentario admite hasta 500 caracteres con contador', async () => {
    await abrir();

    expect(screen.getByLabelText('Cuenta cómo te fue (opcional)')).toHaveProp('maxLength', 500);
    expect(screen.getByText('0/500')).toBeOnTheScreen();
  });
});

describe('/resena/:bookingId', () => {
  test('tras una recarga (solo la URL, sin extra) carga la reserva y muestra el formulario', async () => {
    const { reservas } = await abrir();

    expect(reservas.consultas).toEqual(['res-1']);
    expect(screen.getByText('Tu reseña')).toBeOnTheScreen();
    expect(screen.getByText('Plan p1')).toBeOnTheScreen();
    expect(publicar()).toBeOnTheScreen();
  });

  test('publicar la reseña desde una URL abierta directo vuelve a «Mis reservas»', async () => {
    const { r, resenas } = await abrir();

    await tocar('Publicar reseña');

    expect(resenas.creadas).toEqual([{ bookingId: 'res-1', calificacion: 5, comentario: '' }]);
    expect(r.getPathname()).toBe('/reservas');
    // El aviso sobrevive a la navegación (el `ScaffoldMessenger` de Flutter es de toda la app).
    expect(screen.getByText('¡Gracias! Tu reseña ayudará a otros viajeros.')).toBeOnTheScreen();
  });

  test('una reserva que aún no viajó no se puede reseñar', async () => {
    await abrir({ yaSalio: false });
    expect(screen.getByText('Esta reserva no se puede reseñar')).toBeOnTheScreen();
    expect(screen.getByText('Solo se reseñan los viajes ya realizados que aún no tienen reseña.')).toBeOnTheScreen();
    expect(screen.queryByText('Publicar reseña')).toBeNull();
  });

  test('«Ver mis reservas» desde una reserva no reseñable lleva a la lista', async () => {
    const { r } = await abrir({ estado: BookingStatus.cancelada });

    await tocar('Ver mis reservas');

    expect(r.getPathname()).toBe('/reservas');
  });

  test('una reserva inexistente muestra el error, no una pantalla vacía', async () => {
    await abrir({ url: '/resena/nope' });
    expect(screen.getByText('No pudimos cargar la reserva')).toBeOnTheScreen();
    expect(screen.getByText('Reintentar')).toBeOnTheScreen();
    expect(screen.getByText('Ver mis reservas')).toBeOnTheScreen();
    expect(screen.queryByText('Publicar reseña')).toBeNull();
  });

  test('desde «Mis reservas», la reserva adelantada evita volver a pedirla', async () => {
    const { r, reservas } = await abrir({ url: '/reservas' });
    await tocar('Historial (1)');

    await tocar('Reseñar');

    expect(r.getPathname()).toBe('/resena/res-1');
    expect(publicar()).toBeOnTheScreen();
    expect(reservas.consultas).toEqual([]);
  });

  test('al volver de la reseña «Mis reservas» se recarga', async () => {
    const { r, reservas } = await abrir({ url: '/reservas' });
    await tocar('Historial (1)');
    expect(reservas.consultasLista).toBe(1);

    await tocar('Reseñar');
    await tocar('Publicar reseña');

    expect(r.getPathname()).toBe('/reservas');
    expect(reservas.consultasLista).toBe(2);
  });

  test('la ruta vieja /resena (sin id) lleva a «Mis reservas»', async () => {
    const { r } = await abrir({ url: '/resena' });
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
  ] as const)('en %s el formulario deja lugar al teclado (padding abajo)', async (so, evento) => {
    const original = Platform.OS;
    const oyentes = new Map<string, ((e: KeyboardEvent) => void)[]>();
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((nombre: string, oyente: (e: KeyboardEvent) => void) => {
      oyentes.set(nombre, [...(oyentes.get(nombre) ?? []), oyente]);
      return { remove: () => {} };
    }) as never);
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => so });
    try {
      await abrir();
      const contenedor = screen.getByTestId('resena-teclado');
      // Ocupa toda la ventana (0..800) y el teclado empieza en y = 500: tapa 300 px.
      await fireEvent(contenedor, 'layout', {
        persist: () => {},
        nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } },
      });
      await act(async () => {
        for (const oyente of oyentes.get(evento) ?? []) {
          oyente({ endCoordinates: { screenX: 0, screenY: 500, width: 400, height: 300 } } as KeyboardEvent);
        }
      });

      expect(StyleSheet.flatten(screen.getByTestId('resena-teclado').props.style).paddingBottom).toBe(300);
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original });
      jest.restoreAllMocks();
    }
  });
});

test('abierta en frío (sin historial), «Volver» lleva a Mis reservas en vez de dejarla sin salida', async () => {
  const { r } = await abrir();
  await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
  await asentar();
  expect(r.getPathname()).toBe('/reservas');
});
