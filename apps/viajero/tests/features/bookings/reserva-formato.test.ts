import { Booking, BookingStatus, RefundStatus, PlanDate, CancellationResult, CancellationPreview } from '@/core';
import {
  cuentaRegresiva,
  mensajeCancelacion,
  textoPersonas,
  textoPoliticaCancelacion,
  textoSalida,
} from '@/features/bookings/reserva-formato';

/**
 * Formatos de «Mis reservas» (`reserva_formato.dart` y `textoPoliticaCancelacion` de
 * `cancel_dialog.dart`). Las fechas son locales, como el `toLocal()` de Flutter.
 */

function reserva({
  salidaAt = null,
  fechaPlan = null,
  estado = BookingStatus.confirmed,
}: {
  salidaAt?: Date | null;
  fechaPlan?: Date | null;
  estado?: BookingStatus;
}) {
  return new Booking({
    id: 'b',
    code: 'DIV-1',
    planDateId: 'pd',
    travelerId: 'v',
    pax: 2,
    totalAmount: 1,
    status: estado,
    createdAt: new Date(2026, 9, 1),
    departureAt: salidaAt,
    planDate: fechaPlan ? new PlanDate({ id: 'pd', planId: 'p', date: fechaPlan, totalSpots: 1, availableSpots: 1 }) : null,
  });
}

describe('textoSalida', () => {
  test('con hora congelada: «lun 27 oct · 06:00»', () => {
    expect(textoSalida(reserva({ salidaAt: new Date(2025, 9, 27, 6, 0) }))).toBe('lun 27 oct · 06:00');
  });

  test('solo con la fecha del plan: sin hora', () => {
    expect(textoSalida(reserva({ fechaPlan: new Date(2026, 8, 5) }))).toBe('sáb 5 sept');
  });

  test('sin salida conocida: null', () => {
    expect(textoSalida(reserva({}))).toBeNull();
  });
});

describe('cuentaRegresiva (días de calendario, no bloques de 24 h)', () => {
  const ahora = new Date(2026, 9, 25, 23, 0);

  test('hoy, mañana y en n días', () => {
    expect(cuentaRegresiva(reserva({ salidaAt: new Date(2026, 9, 25, 23, 30) }), ahora)).toBe('Hoy');
    // Faltan 2 horas, pero es mañana.
    expect(cuentaRegresiva(reserva({ salidaAt: new Date(2026, 9, 26, 1, 0) }), ahora)).toBe('Mañana');
    // Faltan 49 horas: tres días de calendario.
    expect(cuentaRegresiva(reserva({ salidaAt: new Date(2026, 9, 28, 0, 0) }), ahora)).toBe('en 3 días');
  });

  test('cruza el cambio de mes', () => {
    expect(cuentaRegresiva(reserva({ salidaAt: new Date(2026, 10, 2, 6) }), ahora)).toBe('en 8 días');
  });

  test('null si ya salió, no tiene salida o está cancelada', () => {
    expect(cuentaRegresiva(reserva({ salidaAt: new Date(2026, 9, 25, 22, 0) }), ahora)).toBeNull();
    expect(cuentaRegresiva(reserva({}), ahora)).toBeNull();
    expect(
      cuentaRegresiva(reserva({ salidaAt: new Date(2026, 9, 27, 6), estado: BookingStatus.cancelled }), ahora),
    ).toBeNull();
  });
});

test('textoPersonas: singular y plural', () => {
  expect(textoPersonas(1)).toBe('1 persona');
  expect(textoPersonas(3)).toBe('3 personas');
});

test('mensajeCancelacion: con y sin reembolso', () => {
  expect(
    mensajeCancelacion(
      new CancellationResult({ applies: true, percentage: 100, amount: 190000, status: RefundStatus.approved, reason: '' }),
    ),
  ).toBe('Reserva cancelada y cupos liberados. Reembolso de prueba aprobado: $ 190.000 (100 %).');
  expect(
    mensajeCancelacion(
      new CancellationResult({ applies: false, percentage: 0, amount: 0, status: RefundStatus.notApplicable, reason: '' }),
    ),
  ).toBe('Reserva cancelada y cupos liberados. Sin reembolso.');
});

test('textoPoliticaCancelacion: 100 %, parcial y sin reembolso', () => {
  const vista = (aplica: boolean, porcentaje: number, monto: number) =>
    new CancellationPreview({ applies: aplica, percentage: porcentaje, amount: monto, hoursBefore: 30, reason: 'motivo del servidor' });
  expect(textoPoliticaCancelacion(vista(true, 100, 300000))).toBe(
    'Si cancelas ahora te devolvemos el 100 % ($ 300.000). Es un reembolso de prueba: no se mueve dinero real.',
  );
  expect(textoPoliticaCancelacion(vista(true, 50, 150000))).toBe(
    'Si cancelas ahora te devolvemos el 50 % ($ 150.000) según la política del plan. Es un reembolso de prueba: no se mueve dinero real.',
  );
  expect(textoPoliticaCancelacion(vista(false, 0, 0))).toBe(
    'Si cancelas ahora no recibirás reembolso. motivo del servidor',
  );
  expect(textoPoliticaCancelacion(vista(true, 0, 0))).toBe('Si cancelas ahora no recibirás reembolso. motivo del servidor');
});
