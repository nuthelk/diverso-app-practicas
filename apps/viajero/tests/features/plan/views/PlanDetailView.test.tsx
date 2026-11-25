import { fireEvent, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import {
  Agency,
  ExperienceCategory,
  formatShortDate,
  ItineraryStep,
  Plan,
  PlanDate,
  PlanStatus,
  Review,
  VerificationStatus,
} from '@/core';
import { PlanDetailView } from '@/features/plan/views/PlanDetailView';
import { agencyColor } from '@/ui/components';

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

async function renderPlanDetail(catalog: CatalogoFalso, reviews = new ResenasFalsas(), width = 600) {
  await fijarVentana(width, 1000);
  await renderPantalla(<PlanDetailView planId="plan-1" />, {
    dependencias: dependenciasDePrueba({ catalogo: catalog, resenas: reviews as never }),
  });
  return catalog;
}

const catalogWithThreeDates = () =>
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
    await renderPlanDetail(catalogWithThreeDates());

    await fireEvent.press(screen.getByText('Reservar'));

    expect(routerFalso.push).toHaveBeenCalledWith('/checkout/plan-1/f-1');
  });

  test('elegir otra fecha cambia el checkout y avisa «¡Últimos N!»', async () => {
    await renderPlanDetail(catalogWithThreeDates());
    expect(screen.getByText('¡Últimos 2!')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('¡Últimos 2!'));
    await fireEvent.press(screen.getByText('Reservar'));

    expect(routerFalso.push).toHaveBeenCalledWith('/checkout/plan-1/f-2');
  });

  test('la fecha elegida sobrevive a que la ficha se reconstruya (más ancho)', async () => {
    await renderPlanDetail(catalogWithThreeDates());
    await fireEvent.press(screen.getByText('¡Últimos 2!'));

    await fijarVentana(700, 1000);
    await fireEvent.press(screen.getByText('Reservar'));

    expect(routerFalso.push).toHaveBeenCalledWith('/checkout/plan-1/f-2');
  });

  // En el emulador el chip de «jue, 26 nov» se comía «nov»: Android midió el texto unos px más
  // angosto de lo que lo dibuja y partió la última palabra a una segunda línea (recortada). Una
  // copia invisible da el ancho del chip y la visible se dibuja encima en UNA línea con holgura.
  const styleOf = (el: { props: { style?: unknown } }) =>
    StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;

  test('los textos del chip de fecha no se cortan: una línea con holgura sobre el ancho medido', async () => {
    const dates = [fechaDePrueba('f-1', { dias: 3 }), fechaDePrueba('f-2', { dias: 5, cupos: 2 })];
    await renderPlanDetail(new CatalogoFalso({ detalles: { 'plan-1': planDePrueba({ dates }) } }));

    for (const [id, texts] of [
      ['f-1', [formatShortDate(dates[0]!.date), '10 cupos']],
      ['f-2', [formatShortDate(dates[1]!.date), '¡Últimos 2!']],
    ] as const) {
      const chip = within(screen.getByTestId(`fecha-${id}`));
      for (const text of texts) {
        const visible = chip.getByText(text);
        expect(visible.props.numberOfLines).toBe(1);
        expect(styleOf(visible)).toMatchObject({ position: 'absolute', left: 0, top: 0 });
        expect(styleOf(visible).right as number).toBeLessThan(0);
        // La copia que mide existe, no se ve ni se anuncia.
        const copies = chip.getAllByText(text, { includeHiddenElements: true });
        expect(copies).toHaveLength(2);
        const measuring = copies.find((c) => c !== visible)!;
        expect(styleOf(measuring).opacity).toBe(0);
        expect(measuring.props.accessibilityElementsHidden).toBe(true);
      }
    }
  });

  test('elegir una fecha no cambia el tamaño de ningún chip (solo colores)', async () => {
    await renderPlanDetail(catalogWithThreeDates());
    const shapes = () =>
      ['f-1', 'f-2', 'f-3'].map((id) =>
        within(screen.getByTestId(`fecha-${id}`))
          .getAllByText(/./, { includeHiddenElements: true })
          .map((t) => {
            const { color: _color, ...rest } = styleOf(t);
            return rest;
          }),
      );
    const before = shapes();

    await fireEvent.press(screen.getByText('¡Últimos 2!'));

    expect(shapes()).toEqual(before);
  });

  test('plan sin fechas: avisa y no ofrece «Reservar»; «Ver otros planes» vuelve seguro', async () => {
    await renderPlanDetail(new CatalogoFalso({ detalles: { 'plan-1': planDePrueba() } }));

    expect(screen.getByText('Sin fechas disponibles por ahora')).toBeOnTheScreen();
    expect(screen.queryByText('Reservar')).toBeNull();

    // Abierta en frío no hay historial: en vez de un `pop` que no hace nada, va al catálogo.
    await fireEvent.press(screen.getByText('Ver otros planes'));
    expect(routerFalso.replace).toHaveBeenCalledWith('/');
  });

  test('error: muestra el aviso y «Reintentar» carga la ficha', async () => {
    const catalog = catalogWithThreeDates();
    catalog.fallo = new Error('sin red');
    await renderPlanDetail(catalog);
    expect(screen.getByText('No pudimos cargar el plan')).toBeOnTheScreen();
    expect(screen.getByText('Revisa tu conexión e intenta de nuevo.')).toBeOnTheScreen();

    catalog.fallo = null;
    await fireEvent.press(screen.getByText('Reintentar'));

    expect(screen.queryByText('No pudimos cargar el plan')).toBeNull();
    expect(screen.getByText('Reservar')).toBeOnTheScreen();
    expect(catalog.detallesPedidos).toEqual(['plan-1', 'plan-1']);
  });

  test('si fallan las reseñas falla toda la ficha', async () => {
    const reviews = new ResenasFalsas();
    reviews.fallo = new Error('sin red');
    await renderPlanDetail(catalogWithThreeDates(), reviews);
    expect(screen.getByText('No pudimos cargar el plan')).toBeOnTheScreen();
  });
});

describe('volver', () => {
  test('sin historial «Volver» lleva al catálogo; con historial, atrás', async () => {
    await renderPlanDetail(catalogWithThreeDates());
    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(routerFalso.replace).toHaveBeenCalledWith('/');

    routerFalso.canGoBack.mockImplementation(() => true);
    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(routerFalso.back).toHaveBeenCalled();
  });
});

describe('tarjeta de la agencia (detalle_agencia_test)', () => {
  const planWithAgency = (logoUrl: string | null = null) =>
    new Plan({
      id: 'plan-1',
      agencyId: 'ag-rutas',
      title: 'Comuna 13 y memoria',
      destination: 'Medellín',
      category: ExperienceCategory.culture,
      priceCop: 120000,
      status: PlanStatus.published,
      agency: new Agency({
        id: 'ag-rutas',
        name: 'Rutas de Antioquia Cultural',
        rntNumber: '12345',
        commercialRegistration: '999',
        verificationStatus: VerificationStatus.verified,
        rntValidUntil: new Date(Date.now() + 365 * 24 * 3600 * 1000),
        logoUrl,
      }),
    });
  const card = () => within(screen.getByTestId('tarjeta-agencia'));

  test('sin logo: iniciales «RA» sobre el color de la agencia, sin pedir imagen', async () => {
    await renderPlanDetail(new CatalogoFalso({ detalles: { 'plan-1': planWithAgency() } }));

    expect(card().getByText('RA')).toBeOnTheScreen();
    expect(card().queryByTestId('agency-avatar-logo')).toBeNull();
    expect(card().getByTestId('agency-avatar-iniciales')).toHaveStyle({ backgroundColor: agencyColor('ag-rutas') });
  });

  test('con logo_url: muestra la imagen', async () => {
    await renderPlanDetail(new CatalogoFalso({ detalles: { 'plan-1': planWithAgency('https://logos.test/rutas.png') } }));
    expect(card().getByTestId('agency-avatar-logo')).toBeTruthy();
  });

  test('celular angosto (320): el sello va debajo del nombre, en la misma columna de texto', async () => {
    await renderPlanDetail(new CatalogoFalso({ detalles: { 'plan-1': planWithAgency() } }), new ResenasFalsas(), 320);

    const texts = within(screen.getByTestId('tarjeta-agencia-textos'));
    expect(texts.getByText('Rutas de Antioquia Cultural')).toBeOnTheScreen();
    expect(texts.getByTestId('sello-agencia')).toBeOnTheScreen();
    expect(texts.getByText('Verificada RNT')).toBeOnTheScreen();
  });

  test('PRESERVE: la tarjeta sigue mostrando RNT y abre la página de la agencia', async () => {
    await renderPlanDetail(new CatalogoFalso({ detalles: { 'plan-1': planWithAgency() } }));

    expect(card().getByText('Rutas de Antioquia Cultural')).toBeOnTheScreen();
    expect(card().getByText(/RNT 12345/)).toBeOnTheScreen();
    await fireEvent.press(card().getByText('Rutas de Antioquia Cultural'));
    expect(routerFalso.push).toHaveBeenCalledWith('/agencia/ag-rutas');
  });
});

describe('reseñas (detalle_resena_test)', () => {
  const planWithReviews = (reviewsCount = 4) =>
    new Plan({
      id: 'plan-1',
      agencyId: 'ag-1',
      title: 'Santa Fe termal',
      destination: 'Santa Fe de Antioquia',
      category: ExperienceCategory.culture,
      priceCop: 178000,
      status: PlanStatus.published,
      reviewsCount,
    });
  const makeReview = (id: string, name: string | null, comment: string | null = null) =>
    new Review({
      id,
      bookingId: `b-${id}`,
      planId: 'plan-1',
      travelerId: `v-${id}`,
      rating: 5,
      createdAt: new Date(2026, 9, 1),
      travelerName: name,
      comment,
    });
  const avatars = () => screen.getAllByTestId('avatar-resena');
  const avatarsWith = (text: string) => avatars().filter((a) => within(a).queryByText(text) !== null);

  async function renderWithReviews(list: Review[], reviewsCount = 4) {
    await renderPlanDetail(new CatalogoFalso({ detalles: { 'plan-1': planWithReviews(reviewsCount) } }), new ResenasFalsas(list));
  }

  test('nombre vacío: no lanza y muestra «V» y «Viajero»', async () => {
    await renderWithReviews([makeReview('1', '', 'Muy bien')]);

    expect(avatarsWith('V')).toHaveLength(1);
    expect(screen.getByText('Viajero')).toBeOnTheScreen();
    expect(screen.getByText('Muy bien')).toBeOnTheScreen();
  });

  test('nombre en blanco se trata como sin nombre', async () => {
    await renderWithReviews([makeReview('1', '   ')]);

    expect(avatarsWith('V')).toHaveLength(1);
    expect(screen.getByText('Viajero')).toBeOnTheScreen();
  });

  test('PRESERVE: con nombre, la inicial va en mayúscula; sin nombre, «V»', async () => {
    await renderWithReviews([makeReview('1', 'ana'), makeReview('2', null)]);

    expect(avatarsWith('A')).toHaveLength(1);
    expect(screen.getByText('ana')).toBeOnTheScreen();
    expect(avatarsWith('V')).toHaveLength(1);
    expect(screen.getByText('Viajero')).toBeOnTheScreen();
  });

  test('la inicial no parte un emoji', async () => {
    await renderWithReviews([makeReview('1', '🌿Ana')]);
    expect(avatarsWith('🌿')).toHaveLength(1);
  });

  test('título con el total y sello de reseña verificada con su etiqueta', async () => {
    await renderWithReviews([makeReview('1', 'ana')], 7);
    expect(screen.getByText('RESEÑAS VERIFICADAS (7)')).toBeOnTheScreen();
    expect(screen.getByLabelText('Reseña verificada: solo quien compró puede opinar')).toBeOnTheScreen();
  });

  test('con reseñas en el plan pero ninguna recibida: «Carga al volver a abrir…»', async () => {
    await renderWithReviews([], 3);
    expect(screen.getByText('RESEÑAS VERIFICADAS (3)')).toBeOnTheScreen();
    expect(screen.getByText('Carga al volver a abrir…')).toBeOnTheScreen();
  });

  test('sin reseñas no hay sección', async () => {
    await renderWithReviews([], 0);
    expect(screen.queryByText(/RESEÑAS VERIFICADAS/)).toBeNull();
  });
});

describe('orden de la pantalla (detalle_scroll_test)', () => {
  const policy = 'Cancelación gratuita hasta 48 horas antes.';
  const longPlan = () =>
    new Plan({
      id: 'plan-1',
      agencyId: 'ag-1',
      title: 'Santa Fe termal',
      destination: 'Santa Fe de Antioquia',
      category: ExperienceCategory.culture,
      priceCop: 178000,
      status: PlanStatus.published,
      cancellationPolicy: policy,
      description: 'Aguas termales y pueblo patrimonio.',
      includes: ['Guía bilingüe'],
      includesTransport: true,
      meetingPoint: 'Parque de Santa Fe',
      itinerary: Array.from({ length: 12 }, (_, i) => new ItineraryStep({ time: `${String(i + 6).padStart(2, '0')}:00`, activity: `Parada ${i + 6}` })),
      dates: [new PlanDate({ id: 'f-1', planId: 'plan-1', date: new Date(Date.now() + 3 * 24 * 3600 * 1000), totalSpots: 20, availableSpots: 20 })],
    });

  test('la barra de reserva va DESPUÉS del contenido desplazable (no encima): el final queda sobre ella', async () => {
    await renderPlanDetail(new CatalogoFalso({ detalles: { 'plan-1': longPlan() } }));

    const view = screen.getByTestId('pantalla-PlanDetailView');
    const content = within(screen.getByTestId('ficha-contenido'));
    // Lo último del contenido está en el scroll; la barra con las fechas, fuera de él.
    expect(content.getByText(policy)).toBeOnTheScreen();
    expect(content.queryByTestId('barra-reserva')).toBeNull();
    expect(within(view).getByTestId('fechas-reserva')).toBeOnTheScreen();
    expect(screen.getByTestId('barra-reserva')).not.toHaveStyle({ position: 'absolute' });
    expect(screen.getByText('Reservar')).toBeOnTheScreen();
  });

  test('secciones: experiencia, qué incluye, itinerario y punto de encuentro', async () => {
    await renderPlanDetail(new CatalogoFalso({ detalles: { 'plan-1': longPlan() } }));

    expect(screen.getByText('LA EXPERIENCIA')).toBeOnTheScreen();
    expect(screen.getByText('QUÉ INCLUYE · PRECIO FINAL')).toBeOnTheScreen();
    expect(screen.getByText('Transporte')).toBeOnTheScreen();
    expect(screen.getByText('Guía bilingüe')).toBeOnTheScreen();
    expect(screen.getByText('ITINERARIO')).toBeOnTheScreen();
    expect(screen.getByText('Parada 17')).toBeOnTheScreen();
    expect(screen.getByText('PUNTO DE ENCUENTRO')).toBeOnTheScreen();
    expect(screen.getByText('Parque de Santa Fe')).toBeOnTheScreen();
  });

  test('itinerario: la línea de tiempo termina en el último paso (12 pasos, 11 tramos)', async () => {
    await renderPlanDetail(new CatalogoFalso({ detalles: { 'plan-1': longPlan() } }));

    expect(screen.getAllByTestId('linea-itinerario')).toHaveLength(11);
  });
});

describe('pantallas anchas', () => {
  test('en web ancha (1280) el contenido va en una columna centrada de 720 como máximo', async () => {
    await renderPlanDetail(new CatalogoFalso({ detalles: { 'plan-1': planDePrueba() } }), new ResenasFalsas(), 1280);

    expect(screen.getByTestId('ficha-columna')).toHaveStyle({ maxWidth: 720, width: '100%', alignSelf: 'center' });
  });

  test('PRESERVE: en el celular (375) la columna ocupa el ancho con los mismos márgenes de 22', async () => {
    await renderPlanDetail(new CatalogoFalso({ detalles: { 'plan-1': planDePrueba() } }), new ResenasFalsas(), 375);

    expect(screen.getByTestId('ficha-columna')).toHaveStyle({ paddingLeft: 22, paddingRight: 22, paddingTop: 20 });
  });
});
