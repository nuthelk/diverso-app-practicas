import { Booking } from '@/core/models/booking';
import {
  BookingStatus,
  EMOJI_EXPERIENCE_CATEGORY,
  enumFromDb,
  ExperienceCategory,
  LABEL_BOOKING_STATUS,
  LABEL_EXPERIENCE_CATEGORY,
  LABEL_PAYMENT_METHOD,
  PaymentMethodOption,
  PaymentStatus,
  PlanStatus,
  UserRole,
  valuesOf,
  VerificationStatus,
} from '@/core/models/enums';
import { VerifiedPaymentStatus, VerifiedPayment } from '@/core/models/payment-checkout';

/**
 * Cada enum que se lee de la BD (o de una Edge Function) debe reconocer TODOS los valores que el
 * servidor puede enviar. En TS el valor del enum ES el texto de la BD (`pendingPayment` →
 * `'pendiente_pago'`), así que lo que se escribe es lo que se lee.
 */
describe('enums leídos de la BD', () => {
  function recognizes<T extends string>(name: string, values: readonly T[], db: Record<string, T>) {
    test(`${name}: cada valor de la BD se reconoce`, () => {
      expect(Object.keys(db)).toHaveLength(values.length);
      for (const [value, expected] of Object.entries(db)) {
        expect(enumFromDb(values, value)).toBe(expected);
        expect(expected).toBe(value);
      }
      expect(enumFromDb(values, 'no_existe')).toBeNull();
      expect(enumFromDb(values, null)).toBeNull();
    });
  }

  recognizes('user_role', valuesOf(UserRole), {
    viajero: UserRole.traveler,
    agencia: UserRole.agency,
    admin: UserRole.admin,
  });
  recognizes('verification_status', valuesOf(VerificationStatus), {
    pendiente: VerificationStatus.pending,
    verificado: VerificationStatus.verified,
    rechazado: VerificationStatus.rejected,
  });
  recognizes('plan_status', valuesOf(PlanStatus), {
    borrador: PlanStatus.draft,
    publicado: PlanStatus.published,
    archivado: PlanStatus.archived,
  });
  recognizes('booking_status', valuesOf(BookingStatus), {
    pendiente_pago: BookingStatus.pendingPayment,
    confirmada: BookingStatus.confirmed,
    cancelada: BookingStatus.cancelled,
    completada: BookingStatus.completed,
  });
  recognizes('payment_method', valuesOf(PaymentMethodOption), {
    pse: PaymentMethodOption.pse,
    nequi: PaymentMethodOption.nequi,
    daviplata: PaymentMethodOption.daviplata,
    tarjeta: PaymentMethodOption.card,
    bancolombia: PaymentMethodOption.bancolombia,
    otro: PaymentMethodOption.other,
  });
  recognizes('payment_status', valuesOf(PaymentStatus), {
    pendiente: PaymentStatus.pending,
    aprobado: PaymentStatus.approved,
    rechazado: PaymentStatus.rejected,
    reembolsado: PaymentStatus.refunded,
  });
  recognizes('experience_category', valuesOf(ExperienceCategory), {
    aventura: ExperienceCategory.adventure,
    naturaleza: ExperienceCategory.nature,
    cultura: ExperienceCategory.culture,
    gastronomia: ExperienceCategory.gastronomy,
    relax: ExperienceCategory.relax,
    urbano: ExperienceCategory.urban,
  });
  recognizes('estado_pago (pagos-verificar)', valuesOf(VerifiedPaymentStatus), {
    aprobado: VerifiedPaymentStatus.approved,
    rechazado: VerifiedPaymentStatus.rejected,
    pendiente: VerifiedPaymentStatus.pending,
    error: VerifiedPaymentStatus.error,
  });
});

describe('los modelos leen el valor de la BD', () => {
  const bookingRow = (status: string) => ({
    id: 'b',
    codigo: 'DIV-1',
    plan_date_id: 'd',
    viajero_id: 'v',
    pax: 1,
    monto_total: 100000,
    estado: status,
    created_at: '2026-10-25T10:00:00+00:00',
  });

  test('Booking.fromMap: los cuatro estados de booking_status', () => {
    for (const e of valuesOf(BookingStatus)) {
      expect(Booking.fromMap(bookingRow(e)).status).toBe(e);
    }
  });

  test('PRESERVE: un valor desconocido sigue cayendo en el valor por defecto', () => {
    expect(Booking.fromMap(bookingRow('algo_nuevo')).status).toBe(BookingStatus.pendingPayment);
  });

  test('VerifiedPayment.fromMap: estado de la reserva con pendiente_pago', () => {
    const read = (status: string) =>
      VerifiedPayment.fromMap({
        estado_pago: 'pendiente',
        referencia: null,
        booking: { id: 'b', codigo: 'DIV-1', estado: status },
      });
    for (const e of valuesOf(BookingStatus)) {
      expect(read(e).bookingStatus).toBe(e);
    }
  });
});

describe('etiquetas de los enums (extra del port)', () => {
  test('estado de la reserva, medio de pago y categoría con su emoji', () => {
    expect(valuesOf(BookingStatus).map((s) => LABEL_BOOKING_STATUS[s])).toEqual([
      'Pendiente de pago',
      'Confirmada',
      'Cancelada',
      'Completada',
    ]);
    expect(valuesOf(PaymentMethodOption).map((m) => LABEL_PAYMENT_METHOD[m])).toEqual([
      'PSE',
      'Nequi',
      'Daviplata',
      'Tarjeta',
      'Bancolombia',
      'Otro medio',
    ]);
    expect(valuesOf(ExperienceCategory).map((c) => LABEL_EXPERIENCE_CATEGORY[c])).toEqual([
      'Aventura',
      'Naturaleza',
      'Cultura',
      'Gastronomía',
      'Relax',
      'Urbano',
    ]);
    expect(valuesOf(ExperienceCategory).map((c) => EMOJI_EXPERIENCE_CATEGORY[c])).toEqual([
      '🧭',
      '🌿',
      '🏘️',
      '🍽️',
      '💤',
      '🏙️',
    ]);
  });
});
