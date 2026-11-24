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
  valoresDe,
  VerificationStatus,
} from '@/core/models/enums';
import { EstadoPago, PagoVerificado } from '@/core/models/pago';

/**
 * Cada enum que se lee de la BD (o de una Edge Function) debe reconocer TODOS los valores que el
 * servidor puede enviar. En TS el valor del enum ES el texto de la BD (`pendientePago` →
 * `'pendiente_pago'`), así que lo que se escribe es lo que se lee.
 */
describe('enums leídos de la BD', () => {
  function reconoce<T extends string>(nombre: string, values: readonly T[], bd: Record<string, T>) {
    test(`${nombre}: cada valor de la BD se reconoce`, () => {
      expect(Object.keys(bd)).toHaveLength(values.length);
      for (const [valor, esperado] of Object.entries(bd)) {
        expect(enumFromDb(values, valor)).toBe(esperado);
        expect(esperado).toBe(valor);
      }
      expect(enumFromDb(values, 'no_existe')).toBeNull();
      expect(enumFromDb(values, null)).toBeNull();
    });
  }

  reconoce('user_role', valoresDe(UserRole), {
    viajero: UserRole.viajero,
    agencia: UserRole.agencia,
    admin: UserRole.admin,
  });
  reconoce('verification_status', valoresDe(VerificationStatus), {
    pendiente: VerificationStatus.pendiente,
    verificado: VerificationStatus.verificado,
    rechazado: VerificationStatus.rechazado,
  });
  reconoce('plan_status', valoresDe(PlanStatus), {
    borrador: PlanStatus.borrador,
    publicado: PlanStatus.publicado,
    archivado: PlanStatus.archivado,
  });
  reconoce('booking_status', valoresDe(BookingStatus), {
    pendiente_pago: BookingStatus.pendientePago,
    confirmada: BookingStatus.confirmada,
    cancelada: BookingStatus.cancelada,
    completada: BookingStatus.completada,
  });
  reconoce('payment_method', valoresDe(PaymentMethodOption), {
    pse: PaymentMethodOption.pse,
    nequi: PaymentMethodOption.nequi,
    daviplata: PaymentMethodOption.daviplata,
    tarjeta: PaymentMethodOption.tarjeta,
    bancolombia: PaymentMethodOption.bancolombia,
    otro: PaymentMethodOption.otro,
  });
  reconoce('payment_status', valoresDe(PaymentStatus), {
    pendiente: PaymentStatus.pendiente,
    aprobado: PaymentStatus.aprobado,
    rechazado: PaymentStatus.rechazado,
    reembolsado: PaymentStatus.reembolsado,
  });
  reconoce('experience_category', valoresDe(ExperienceCategory), {
    aventura: ExperienceCategory.aventura,
    naturaleza: ExperienceCategory.naturaleza,
    cultura: ExperienceCategory.cultura,
    gastronomia: ExperienceCategory.gastronomia,
    relax: ExperienceCategory.relax,
    urbano: ExperienceCategory.urbano,
  });
  reconoce('estado_pago (pagos-verificar)', valoresDe(EstadoPago), {
    aprobado: EstadoPago.aprobado,
    rechazado: EstadoPago.rechazado,
    pendiente: EstadoPago.pendiente,
    error: EstadoPago.error,
  });
});

describe('los modelos leen el valor de la BD', () => {
  const reserva = (estado: string) => ({
    id: 'b',
    codigo: 'DIV-1',
    plan_date_id: 'd',
    viajero_id: 'v',
    pax: 1,
    monto_total: 100000,
    estado,
    created_at: '2026-10-25T10:00:00+00:00',
  });

  test('Booking.fromMap: los cuatro estados de booking_status', () => {
    for (const e of valoresDe(BookingStatus)) {
      expect(Booking.fromMap(reserva(e)).estado).toBe(e);
    }
  });

  test('PRESERVE: un valor desconocido sigue cayendo en el valor por defecto', () => {
    expect(Booking.fromMap(reserva('algo_nuevo')).estado).toBe(BookingStatus.pendientePago);
  });

  test('PagoVerificado.fromMap: estado de la reserva con pendiente_pago', () => {
    const leer = (estado: string) =>
      PagoVerificado.fromMap({
        estado_pago: 'pendiente',
        referencia: null,
        booking: { id: 'b', codigo: 'DIV-1', estado },
      });
    for (const e of valoresDe(BookingStatus)) {
      expect(leer(e).bookingEstado).toBe(e);
    }
  });
});

describe('etiquetas de los enums (extra del port)', () => {
  test('estado de la reserva, medio de pago y categoría con su emoji', () => {
    expect(valoresDe(BookingStatus).map((s) => LABEL_BOOKING_STATUS[s])).toEqual([
      'Pendiente de pago',
      'Confirmada',
      'Cancelada',
      'Completada',
    ]);
    expect(valoresDe(PaymentMethodOption).map((m) => LABEL_PAYMENT_METHOD[m])).toEqual([
      'PSE',
      'Nequi',
      'Daviplata',
      'Tarjeta',
      'Bancolombia',
      'Otro medio',
    ]);
    expect(valoresDe(ExperienceCategory).map((c) => LABEL_EXPERIENCE_CATEGORY[c])).toEqual([
      'Aventura',
      'Naturaleza',
      'Cultura',
      'Gastronomía',
      'Relax',
      'Urbano',
    ]);
    expect(valoresDe(ExperienceCategory).map((c) => EMOJI_EXPERIENCE_CATEGORY[c])).toEqual([
      '🧭',
      '🌿',
      '🏘️',
      '🍽️',
      '💤',
      '🏙️',
    ]);
  });
});
