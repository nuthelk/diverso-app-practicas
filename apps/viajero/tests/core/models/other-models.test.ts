import { CreatedBooking } from '@/core/models/created-booking';
import { UserRole, VerificationStatus } from '@/core/models/enums';
import { StartedCheckout, VerifiedPaymentStatus, VerifiedPayment } from '@/core/models/payment-checkout';
import { ItineraryStep, Plan, PlanDate } from '@/core/models/plan';
import { Agency, Profile } from '@/core/models/profile';
import { RefundStatus, CancellationResult } from '@/core/models/refund';
import { Review } from '@/core/models/review';
import { fechaLocal, fechaUtc } from '@/core/utils/fechas';

/** Modelos sin test en el núcleo Dart: mapeo de columnas y valores por defecto. */
describe('Profile y Agency', () => {
  test('Profile: rol por defecto viajero y nombre vacío', () => {
    const p = Profile.fromMap({ id: 'u' });
    expect(p).toMatchObject({ id: 'u', role: UserRole.traveler, name: '', phone: null });
    expect(Profile.fromMap({ id: 'u', rol: 'admin', nombre: 'Ana', telefono: '300' }).role).toBe(UserRole.admin);
  });

  test('Agency: columnas, defaults y RNT como fecha local', () => {
    const a = Agency.fromMap({ id: 'a', nombre: 'Rutas', numero_rnt: '123', rnt_vigente_hasta: '2027-01-15' });
    expect(a).toMatchObject({
      id: 'a',
      ownerUserId: null,
      name: 'Rutas',
      description: '',
      rntNumber: '123',
      commercialRegistration: '',
      city: 'Medellín',
      verificationStatus: VerificationStatus.pending,
      commissionPct: 12,
      logoUrl: null,
    });
    expect(a.rntValidUntil).toEqual(fechaLocal(2027, 1, 15));
    expect(Agency.fromMap({ id: 'a', nombre: 'R', numero_rnt: '1', rnt_vigente_hasta: 'xx' }).rntValidUntil).toBeNull();
  });

  test('verificada: estado verificado y RNT vigente hasta hoy inclusive (fecha del teléfono)', () => {
    const today = new Date();
    const day = (delta: number) => fechaLocal(today.getFullYear(), today.getMonth() + 1, today.getDate() + delta);
    const agency = (status: VerificationStatus, until: Date | null) =>
      new Agency({
        id: 'a',
        name: 'R',
        rntNumber: '1',
        commercialRegistration: '',
        verificationStatus: status,
        rntValidUntil: until,
      });
    expect(agency(VerificationStatus.verified, day(0)).isVerified).toBe(true);
    expect(agency(VerificationStatus.verified, day(-1)).isVerified).toBe(false);
    expect(agency(VerificationStatus.verified, null).isVerified).toBe(false);
    expect(agency(VerificationStatus.pending, day(30)).isVerified).toBe(false);
  });
});

describe('Plan', () => {
  test('fromMap: defaults de la columna y embebidos', () => {
    const p = Plan.fromMap({
      id: 'p',
      agency_id: 'a',
      titulo: 'T',
      destino: 'D',
      precio_cop: 120000,
      fotos: ['https://f/1.jpg', 'https://f/2.jpg'],
      itinerario: [{ hora: '06:00', actividad: 'Salida' }, {}],
      agencies: { id: 'a', nombre: 'Rutas', numero_rnt: '1' },
    });
    expect(p).toMatchObject({
      category: 'aventura',
      status: 'borrador',
      durationText: '1 día',
      durationHours: 12,
      departureMinutes: 360,
      includes: [],
      averageRating: 0,
      reviewsCount: 0,
      mainPhoto: 'https://f/1.jpg',
      isNew: true,
    });
    expect(p.agency?.name).toBe('Rutas');
    expect(p.itinerary.map((i) => i.toMap())).toEqual([
      { hora: '06:00', actividad: 'Salida' },
      { hora: '', actividad: '' },
    ]);
    expect(Plan.fromMap({ id: 'p', agency_id: 'a', titulo: 'T', destino: 'D', precio_cop: 1 }).mainPhoto).toBeNull();
  });

  test('PlanDate: tieneCupos y toInsertMap con fecha YYYY-MM-DD', () => {
    const d = new PlanDate({ id: 'd', planId: 'p', date: fechaLocal(2026, 3, 7), totalSpots: 10, availableSpots: 0 });
    expect(d.hasSpots).toBe(false);
    expect(d.toInsertMap()).toEqual({ plan_id: 'p', fecha: '2026-03-07', cupo_total: 10, cupo_disponible: 0 });
    expect(new ItineraryStep({ time: '7', activity: 'a' }).toMap()).toEqual({ hora: '7', actividad: 'a' });
  });
});

describe('pagos, cancelación y reseñas', () => {
  test('CheckoutIniciado: monto en pesos y vencimiento como instante', () => {
    const c = StartedCheckout.fromMap({
      checkout_url: 'u',
      referencia: 'DIV-1-1',
      amount_in_cents: 30000000,
      expira_at: '2026-10-25T10:30:00-05:00',
    });
    expect(c.amount).toBe(300000);
    expect(c.expiresAt).toEqual(fechaUtc(2026, 10, 25, 15, 30));
  });

  test('PagoVerificado: estado desconocido → error; método desconocido → otro; mensajes', () => {
    const p = VerifiedPayment.fromMap({
      estado_pago: 'raro',
      metodo: 'BITCOIN',
      referencia: 'r',
      booking: { id: 'b', codigo: 'C', estado: 'confirmada' },
    });
    expect(p.status).toBe(VerifiedPaymentStatus.error);
    expect(p.method).toBe('otro');
    expect(p.userMessage).toBe(
      'Wompi no pudo procesar el pago de prueba. Puedes intentar de nuevo mientras tu reserva siga vigente (30 minutos).',
    );
    const messageFor = (status: string) =>
      VerifiedPayment.fromMap({ estado_pago: status, booking: { id: 'b', codigo: 'C' } }).userMessage;
    expect(messageFor('aprobado')).toBe('¡Pago de prueba aprobado! Tu reserva está confirmada.');
    expect(messageFor('rechazado')).toBe(
      'Wompi rechazó el pago de prueba (fondos, datos o el resultado del banco). ' +
        'Puedes intentar de nuevo mientras tu reserva siga vigente (30 minutos).',
    );
    expect(messageFor('pendiente')).toBe(
      'Tu pago de prueba sigue pendiente. Te avisaremos en Mis reservas cuando Wompi lo confirme.',
    );
  });

  test('ResultadoCancelacion lee el objeto reembolso', () => {
    const r = CancellationResult.fromMap({
      estado: 'cancelada',
      reembolso: { aplica: true, porcentaje: 100, monto: 300000, estado: 'pendiente', motivo: 'm' },
    });
    expect(r).toMatchObject({ applies: true, percentage: 100, amount: 300000, status: RefundStatus.pending, reason: 'm' });
  });

  test('Review: autor desde profiles(nombre) o null (RLS lo oculta para reseñas ajenas)', () => {
    const base = {
      id: 'r',
      booking_id: 'b',
      plan_id: 'p',
      viajero_id: 'v',
      calificacion: 5,
      comentario: null,
      created_at: '2026-10-25T10:00:00+00:00',
    };
    expect(Review.fromMap({ ...base, profiles: { nombre: 'Ana' } }).travelerName).toBe('Ana');
    const othersReview = Review.fromMap({ ...base, profiles: null });
    expect(othersReview.travelerName).toBeNull();
    expect(othersReview.comment).toBeNull();
    expect(othersReview.createdAt).toEqual(fechaUtc(2026, 10, 25, 10));
  });

  test('CreatedBooking guarda lo que devuelve create_booking', () => {
    const c = new CreatedBooking({ bookingId: 'b', code: 'C', totalAmount: 1, planTitle: '' });
    expect(c.date).toBeNull();
  });
});
