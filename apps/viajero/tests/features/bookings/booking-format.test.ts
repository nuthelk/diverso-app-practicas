import { Booking, BookingStatus, RefundStatus, PlanDate, CancellationResult, CancellationPreview } from '@/core';
import {
  countdown,
  cancellationMessage,
  travelersText,
  cancellationPolicyText,
  departureText,
} from '@/features/bookings/booking-format';

/**
 * Formatos de «Mis reservas» (`reserva_formato.dart` y `textoPoliticaCancelacion` de
 * `cancel_dialog.dart`). Las fechas son locales, como el `toLocal()` de Flutter.
 */

function booking({
  departureAt = null,
  planDate = null,
  status = BookingStatus.confirmed,
}: {
  departureAt?: Date | null;
  planDate?: Date | null;
  status?: BookingStatus;
}) {
  return new Booking({
    id: 'b',
    code: 'DIV-1',
    planDateId: 'pd',
    travelerId: 'v',
    pax: 2,
    totalAmount: 1,
    status,
    createdAt: new Date(2026, 9, 1),
    departureAt,
    planDate: planDate ? new PlanDate({ id: 'pd', planId: 'p', date: planDate, totalSpots: 1, availableSpots: 1 }) : null,
  });
}

describe('departureText', () => {
  test('con hora congelada: «lun 27 oct · 06:00»', () => {
    expect(departureText(booking({ departureAt: new Date(2025, 9, 27, 6, 0) }))).toBe('lun 27 oct · 06:00');
  });

  test('solo con la fecha del plan: sin hora', () => {
    expect(departureText(booking({ planDate: new Date(2026, 8, 5) }))).toBe('sáb 5 sept');
  });

  test('sin salida conocida: null', () => {
    expect(departureText(booking({}))).toBeNull();
  });
});

describe('countdown (días de calendario, no bloques de 24 h)', () => {
  const now = new Date(2026, 9, 25, 23, 0);

  test('hoy, mañana y en n días', () => {
    expect(countdown(booking({ departureAt: new Date(2026, 9, 25, 23, 30) }), now)).toBe('Hoy');
    // Faltan 2 horas, pero es mañana.
    expect(countdown(booking({ departureAt: new Date(2026, 9, 26, 1, 0) }), now)).toBe('Mañana');
    // Faltan 49 horas: tres días de calendario.
    expect(countdown(booking({ departureAt: new Date(2026, 9, 28, 0, 0) }), now)).toBe('en 3 días');
  });

  test('cruza el cambio de mes', () => {
    expect(countdown(booking({ departureAt: new Date(2026, 10, 2, 6) }), now)).toBe('en 8 días');
  });

  test('null si ya salió, no tiene salida o está cancelada', () => {
    expect(countdown(booking({ departureAt: new Date(2026, 9, 25, 22, 0) }), now)).toBeNull();
    expect(countdown(booking({}), now)).toBeNull();
    expect(
      countdown(booking({ departureAt: new Date(2026, 9, 27, 6), status: BookingStatus.cancelled }), now),
    ).toBeNull();
  });
});

test('travelersText: singular y plural', () => {
  expect(travelersText(1)).toBe('1 persona');
  expect(travelersText(3)).toBe('3 personas');
});

test('cancellationMessage: con y sin reembolso', () => {
  expect(
    cancellationMessage(
      new CancellationResult({ applies: true, percentage: 100, amount: 190000, status: RefundStatus.approved, reason: '' }),
    ),
  ).toBe('Reserva cancelada y cupos liberados. Reembolso de prueba aprobado: $ 190.000 (100 %).');
  expect(
    cancellationMessage(
      new CancellationResult({ applies: false, percentage: 0, amount: 0, status: RefundStatus.notApplicable, reason: '' }),
    ),
  ).toBe('Reserva cancelada y cupos liberados. Sin reembolso.');
});

test('cancellationPolicyText: 100 %, parcial y sin reembolso', () => {
  const previewOf = (applies: boolean, percentage: number, amount: number) =>
    new CancellationPreview({ applies, percentage, amount, hoursBefore: 30, reason: 'motivo del servidor' });
  expect(cancellationPolicyText(previewOf(true, 100, 300000))).toBe(
    'Si cancelas ahora te devolvemos el 100 % ($ 300.000). Es un reembolso de prueba: no se mueve dinero real.',
  );
  expect(cancellationPolicyText(previewOf(true, 50, 150000))).toBe(
    'Si cancelas ahora te devolvemos el 50 % ($ 150.000) según la política del plan. Es un reembolso de prueba: no se mueve dinero real.',
  );
  expect(cancellationPolicyText(previewOf(false, 0, 0))).toBe(
    'Si cancelas ahora no recibirás reembolso. motivo del servidor',
  );
  expect(cancellationPolicyText(previewOf(true, 0, 0))).toBe('Si cancelas ahora no recibirás reembolso. motivo del servidor');
});
