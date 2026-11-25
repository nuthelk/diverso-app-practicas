import { fireEvent, screen, within } from '@testing-library/react-native';

import {
  Agency,
  ExperienceCategory,
  ItinerarioPaso,
  Plan,
  PlanDate,
  PlanStatus,
  Review,
  VerificationStatus,
} from '@/core';
import { PlanDetailView } from '@/features/plan/views/PlanDetailView';
import { colorDeAgencia } from '@/ui/components';

import { CatalogoFalso, fechaDePrueba, planDePrueba, ResenasFalsas } from '../../../support/catalogo-falso';
import { dependenciasDePrueba } from '../../../support/dependencias-de-prueba';
import { reiniciarRouterFalso, routerFalso } from '../../../support/expo-router-falso';
import { fijarVentana, renderPantalla, restaurarVentana } from '../../../support/pantalla';

jest.mock('expo-router', () => require('../../../support/expo-router-falso'));

/**
 * Ficha del plan: la barra de reserva (fecha elegida → checkout, «¡Últimos N!», sin fechas),
 * error + reintentar, tarjeta de la agencia, reseñas y el orden de la pantalla (la barra va debajo
 * del scroll). Port de `detalle_fechas_test.dart`, `detalle_agencia_test.dart`,
 * `detalle_resena_test.dart` y `detalle_scroll_test.dart` (+ «Carga al volver a abrir…» y volver
 * seguro).
 */

async function abrir(catalogo: CatalogoFalso, resenas = new ResenasFalsas(), ancho = 600) {
  await fijarVentana(ancho, 1000);
  await renderPantalla(<PlanDetailView planId="plan-1" />, {
    dependencias: dependenciasDePrueba({ catalogo, resenas: resenas as never }),
  });
  return catalogo;
}

const conTresFechas = () =>
  new CatalogoFalso({
    detalles: {
      'plan-1': planDePrueba({
        dates: [fechaDePrueba('f-1', { dias: 3 }), fechaDePrueba('f-2', { dias: 5, cupos: 2 }), fechaDePrueba('f-3', { dias: 9 })],
      }),
    },
  });

beforeEach(() => {
  reiniciarRouterFalso();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(async () => {
  await restaurarVentana();
  jest.restoreAllMocks();
});

describe('barra de reserva (detalle_fechas_test)', () => {
  test('sin elegir, «Reservar» lleva a la fecha más cercana', async () => {
    await abrir(conTresFechas());

    await fireEvent.press(screen.getByText('Reservar'));

    expect(routerFalso.push).toHaveBeenCalledWith('/checkout/plan-1/f-1');
  });

  test('elegir otra fecha cambia el checkout y avisa «¡Últimos N!»', async () => {
    await abrir(conTresFechas());
    expect(screen.getByText('¡Últimos 2!')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('¡Últimos 2!'));
    await fireEvent.press(screen.getByText('Reservar'));

    expect(routerFalso.push).toHaveBeenCalledWith('/checkout/plan-1/f-2');
  });

  test('la fecha elegida sobrevive a que la ficha se reconstruya (más ancho)', async () => {
    await abrir(conTresFechas());
    await fireEvent.press(screen.getByText('¡Últimos 2!'));

    await fijarVentana(700, 1000);
    await fireEvent.press(screen.getByText('Reservar'));

    expect(routerFalso.push).toHaveBeenCalledWith('/checkout/plan-1/f-2');
  });

  test('plan sin fechas: avisa y no ofrece «Reservar»; «Ver otros planes» vuelve seguro', async () => {
    await abrir(new CatalogoFalso({ detalles: { 'plan-1': planDePrueba() } }));

    expect(screen.getByText('Sin fechas disponibles por ahora')).toBeOnTheScreen();
    expect(screen.queryByText('Reservar')).toBeNull();

    // Abierta en frío no hay historial: en vez de un `pop` que no hace nada, va al catálogo.
    await fireEvent.press(screen.getByText('Ver otros planes'));
    expect(routerFalso.replace).toHaveBeenCalledWith('/');
  });

  test('error: muestra el aviso y «Reintentar» carga la ficha', async () => {
    const catalogo = conTresFechas();
    catalogo.fallo = new Error('sin red');
    await abrir(catalogo);
    expect(screen.getByText('No pudimos cargar el plan')).toBeOnTheScreen();
    expect(screen.getByText('Revisa tu conexión e intenta de nuevo.')).toBeOnTheScreen();

    catalogo.fallo = null;
    await fireEvent.press(screen.getByText('Reintentar'));

    expect(screen.queryByText('No pudimos cargar el plan')).toBeNull();
    expect(screen.getByText('Reservar')).toBeOnTheScreen();
    expect(catalogo.detallesPedidos).toEqual(['plan-1', 'plan-1']);
  });

  test('si fallan las reseñas falla toda la ficha', async () => {
    const resenas = new ResenasFalsas();
    resenas.fallo = new Error('sin red');
    await abrir(conTresFechas(), resenas);
    expect(screen.getByText('No pudimos cargar el plan')).toBeOnTheScreen();
  });
});

describe('volver', () => {
  test('sin historial «Volver» lleva al catálogo; con historial, atrás', async () => {
    await abrir(conTresFechas());
    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(routerFalso.replace).toHaveBeenCalledWith('/');

    routerFalso.canGoBack.mockImplementation(() => true);
    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(routerFalso.back).toHaveBeenCalled();
  });
});

describe('tarjeta de la agencia (detalle_agencia_test)', () => {
  const planConAgencia = (logoUrl: string | null = null) =>
    new Plan({
      id: 'plan-1',
      agencyId: 'ag-rutas',
      titulo: 'Comuna 13 y memoria',
      destino: 'Medellín',
      categoria: ExperienceCategory.cultura,
      precioCop: 120000,
      estado: PlanStatus.publicado,
      agency: new Agency({
        id: 'ag-rutas',
        nombre: 'Rutas de Antioquia Cultural',
        numeroRnt: '12345',
        matriculaCamaraComercio: '999',
        estadoVerificacion: VerificationStatus.verificado,
        rntVigenteHasta: new Date(Date.now() + 365 * 24 * 3600 * 1000),
        logoUrl,
      }),
    });
  const tarjeta = () => within(screen.getByTestId('tarjeta-agencia'));

  test('sin logo: iniciales «RA» sobre el color de la agencia, sin pedir imagen', async () => {
    await abrir(new CatalogoFalso({ detalles: { 'plan-1': planConAgencia() } }));

    expect(tarjeta().getByText('RA')).toBeOnTheScreen();
    expect(tarjeta().queryByTestId('agency-avatar-logo')).toBeNull();
    expect(tarjeta().getByTestId('agency-avatar-iniciales')).toHaveStyle({ backgroundColor: colorDeAgencia('ag-rutas') });
  });

  test('con logo_url: muestra la imagen', async () => {
    await abrir(new CatalogoFalso({ detalles: { 'plan-1': planConAgencia('https://logos.test/rutas.png') } }));
    expect(tarjeta().getByTestId('agency-avatar-logo')).toBeTruthy();
  });

  test('celular angosto (320): el sello va debajo del nombre, en la misma columna de texto', async () => {
    await abrir(new CatalogoFalso({ detalles: { 'plan-1': planConAgencia() } }), new ResenasFalsas(), 320);

    const textos = within(screen.getByTestId('tarjeta-agencia-textos'));
    expect(textos.getByText('Rutas de Antioquia Cultural')).toBeOnTheScreen();
    expect(textos.getByTestId('sello-agencia')).toBeOnTheScreen();
    expect(textos.getByText('Verificada RNT')).toBeOnTheScreen();
  });

  test('PRESERVE: la tarjeta sigue mostrando RNT y abre la página de la agencia', async () => {
    await abrir(new CatalogoFalso({ detalles: { 'plan-1': planConAgencia() } }));

    expect(tarjeta().getByText('Rutas de Antioquia Cultural')).toBeOnTheScreen();
    expect(tarjeta().getByText(/RNT 12345/)).toBeOnTheScreen();
    await fireEvent.press(tarjeta().getByText('Rutas de Antioquia Cultural'));
    expect(routerFalso.push).toHaveBeenCalledWith('/agencia/ag-rutas');
  });
});

describe('reseñas (detalle_resena_test)', () => {
  const planConResenas = (reviewsCount = 4) =>
    new Plan({
      id: 'plan-1',
      agencyId: 'ag-1',
      titulo: 'Santa Fe termal',
      destino: 'Santa Fe de Antioquia',
      categoria: ExperienceCategory.cultura,
      precioCop: 178000,
      estado: PlanStatus.publicado,
      reviewsCount,
    });
  const resena = (id: string, nombre: string | null, comentario: string | null = null) =>
    new Review({
      id,
      bookingId: `b-${id}`,
      planId: 'plan-1',
      viajeroId: `v-${id}`,
      calificacion: 5,
      createdAt: new Date(2026, 9, 1),
      viajeroNombre: nombre,
      comentario,
    });
  const avatares = () => screen.getAllByTestId('avatar-resena');
  const avatarCon = (texto: string) => avatares().filter((a) => within(a).queryByText(texto) !== null);

  async function abrirConResenas(lista: Review[], reviewsCount = 4) {
    await abrir(new CatalogoFalso({ detalles: { 'plan-1': planConResenas(reviewsCount) } }), new ResenasFalsas(lista));
  }

  test('nombre vacío: no lanza y muestra «V» y «Viajero»', async () => {
    await abrirConResenas([resena('1', '', 'Muy bien')]);

    expect(avatarCon('V')).toHaveLength(1);
    expect(screen.getByText('Viajero')).toBeOnTheScreen();
    expect(screen.getByText('Muy bien')).toBeOnTheScreen();
  });

  test('nombre en blanco se trata como sin nombre', async () => {
    await abrirConResenas([resena('1', '   ')]);

    expect(avatarCon('V')).toHaveLength(1);
    expect(screen.getByText('Viajero')).toBeOnTheScreen();
  });

  test('PRESERVE: con nombre, la inicial va en mayúscula; sin nombre, «V»', async () => {
    await abrirConResenas([resena('1', 'ana'), resena('2', null)]);

    expect(avatarCon('A')).toHaveLength(1);
    expect(screen.getByText('ana')).toBeOnTheScreen();
    expect(avatarCon('V')).toHaveLength(1);
    expect(screen.getByText('Viajero')).toBeOnTheScreen();
  });

  test('la inicial no parte un emoji', async () => {
    await abrirConResenas([resena('1', '🌿Ana')]);
    expect(avatarCon('🌿')).toHaveLength(1);
  });

  test('título con el total y sello de reseña verificada con su etiqueta', async () => {
    await abrirConResenas([resena('1', 'ana')], 7);
    expect(screen.getByText('RESEÑAS VERIFICADAS (7)')).toBeOnTheScreen();
    expect(screen.getByLabelText('Reseña verificada: solo quien compró puede opinar')).toBeOnTheScreen();
  });

  test('con reseñas en el plan pero ninguna recibida: «Carga al volver a abrir…»', async () => {
    await abrirConResenas([], 3);
    expect(screen.getByText('RESEÑAS VERIFICADAS (3)')).toBeOnTheScreen();
    expect(screen.getByText('Carga al volver a abrir…')).toBeOnTheScreen();
  });

  test('sin reseñas no hay sección', async () => {
    await abrirConResenas([], 0);
    expect(screen.queryByText(/RESEÑAS VERIFICADAS/)).toBeNull();
  });
});

describe('orden de la pantalla (detalle_scroll_test)', () => {
  const politica = 'Cancelación gratuita hasta 48 horas antes.';
  const planLargo = () =>
    new Plan({
      id: 'plan-1',
      agencyId: 'ag-1',
      titulo: 'Santa Fe termal',
      destino: 'Santa Fe de Antioquia',
      categoria: ExperienceCategory.cultura,
      precioCop: 178000,
      estado: PlanStatus.publicado,
      politicaCancelacion: politica,
      descripcion: 'Aguas termales y pueblo patrimonio.',
      incluye: ['Guía bilingüe'],
      incluyeTransporte: true,
      puntoEncuentro: 'Parque de Santa Fe',
      itinerario: Array.from({ length: 12 }, (_, i) => new ItinerarioPaso({ hora: `${String(i + 6).padStart(2, '0')}:00`, actividad: `Parada ${i + 6}` })),
      dates: [new PlanDate({ id: 'f-1', planId: 'plan-1', fecha: new Date(Date.now() + 3 * 24 * 3600 * 1000), cupoTotal: 20, cupoDisponible: 20 })],
    });

  test('la barra de reserva va DESPUÉS del contenido desplazable (no encima): el final queda sobre ella', async () => {
    await abrir(new CatalogoFalso({ detalles: { 'plan-1': planLargo() } }));

    const pantalla = screen.getByTestId('pantalla-PlanDetailView');
    const contenido = within(screen.getByTestId('ficha-contenido'));
    // Lo último del contenido está en el scroll; la barra con las fechas, fuera de él.
    expect(contenido.getByText(politica)).toBeOnTheScreen();
    expect(contenido.queryByTestId('barra-reserva')).toBeNull();
    expect(within(pantalla).getByTestId('fechas-reserva')).toBeOnTheScreen();
    expect(screen.getByTestId('barra-reserva')).not.toHaveStyle({ position: 'absolute' });
    expect(screen.getByText('Reservar')).toBeOnTheScreen();
  });

  test('secciones: experiencia, qué incluye, itinerario y punto de encuentro', async () => {
    await abrir(new CatalogoFalso({ detalles: { 'plan-1': planLargo() } }));

    expect(screen.getByText('LA EXPERIENCIA')).toBeOnTheScreen();
    expect(screen.getByText('QUÉ INCLUYE · PRECIO FINAL')).toBeOnTheScreen();
    expect(screen.getByText('Transporte')).toBeOnTheScreen();
    expect(screen.getByText('Guía bilingüe')).toBeOnTheScreen();
    expect(screen.getByText('ITINERARIO')).toBeOnTheScreen();
    expect(screen.getByText('Parada 17')).toBeOnTheScreen();
    expect(screen.getByText('PUNTO DE ENCUENTRO')).toBeOnTheScreen();
    expect(screen.getByText('Parque de Santa Fe')).toBeOnTheScreen();
  });
});

describe('pantallas anchas', () => {
  test('en web ancha (1280) el contenido va en una columna centrada de 720 como máximo', async () => {
    await abrir(new CatalogoFalso({ detalles: { 'plan-1': planDePrueba() } }), new ResenasFalsas(), 1280);

    expect(screen.getByTestId('ficha-columna')).toHaveStyle({ maxWidth: 720, width: '100%', alignSelf: 'center' });
  });

  test('PRESERVE: en el celular (375) la columna ocupa el ancho con los mismos márgenes de 22', async () => {
    await abrir(new CatalogoFalso({ detalles: { 'plan-1': planDePrueba() } }), new ResenasFalsas(), 375);

    expect(screen.getByTestId('ficha-columna')).toHaveStyle({ paddingLeft: 22, paddingRight: 22, paddingTop: 20 });
  });
});
