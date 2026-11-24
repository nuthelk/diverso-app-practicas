import { Booking } from '@/core/models/booking';
import { PaymentMethodOption } from '@/core/models/enums';
import { EstadoReembolso, VistaPreviaCancelacion } from '@/core/models/reembolso';

describe('reembolsos y pagos de la reserva', () => {
  test('VistaPreviaCancelacion.fromMap (vista_previa_cancelacion)', () => {
    const v = VistaPreviaCancelacion.fromMap({
      booking_id: 'b',
      horas_antes: 30.5,
      aplica: true,
      porcentaje: 50,
      monto: 150000.0,
      motivo: 'x',
    });
    expect(v.aplica).toBe(true);
    expect(v.porcentaje).toBe(50);
    expect(v.monto).toBe(150000);
    expect(v.horasAntes).toBe(30.5);
    expect(v.motivo).toBe('x');
  });

  test('Payment y Refund se leen con sus columnas explícitas', () => {
    const b = Booking.fromMap({
      id: 'b',
      codigo: 'DIV-1',
      plan_date_id: 'd',
      viajero_id: 'v',
      pax: 2,
      monto_total: 300000,
      estado: 'cancelada',
      created_at: '2026-10-25T10:00:00+00:00',
      payments: [
        {
          id: 'p',
          booking_id: 'b',
          metodo: 'bancolombia',
          estado: 'reembolsado',
          monto: 300000,
          referencia: 'DIV-1-1',
          provider: 'wompi',
          simulated: false,
        },
      ],
      refunds: [
        {
          id: 'r1',
          booking_id: 'b',
          monto: 150000,
          porcentaje: 50,
          estado: 'pendiente',
          origen: 'cancelacion',
          motivo: 'm',
          created_at: '2026-10-25T11:00:00+00:00',
        },
        {
          id: 'r2',
          booking_id: 'b',
          monto: 150000,
          porcentaje: 50,
          estado: 'aprobado',
          origen: 'cancelacion',
          motivo: 'm',
          created_at: '2026-10-25T12:00:00+00:00',
        },
      ],
    });
    expect(b.pago!.metodo).toBe(PaymentMethodOption.bancolombia);
    expect(b.pago!.textoReferencia).toBe('Pagado con Bancolombia · ref. DIV-1-1 (prueba)');
    // el más reciente
    expect(b.reembolso!.estado).toBe(EstadoReembolso.aprobado);
    expect(b.etiquetaReembolso).toBe('Reembolso de prueba aprobado · 50 % · $ 150.000');
  });

  test('cancelada con pago y sin reembolso → «Sin reembolso»; sin pago → nada', () => {
    const base = (pagos: Record<string, unknown>[]) => ({
      id: 'b',
      codigo: 'DIV-1',
      plan_date_id: 'd',
      viajero_id: 'v',
      pax: 1,
      monto_total: 100000,
      estado: 'cancelada',
      created_at: '2026-10-25T10:00:00+00:00',
      payments: pagos,
      refunds: [],
    });
    const conPago = Booking.fromMap(
      base([
        {
          id: 'p',
          booking_id: 'b',
          metodo: 'nequi',
          estado: 'aprobado',
          monto: 100000,
          referencia: 'R',
          provider: 'wompi',
          simulated: false,
        },
      ]),
    );
    expect(conPago.etiquetaReembolso).toBe('Sin reembolso');
    expect(Booking.fromMap(base([])).etiquetaReembolso).toBeNull();
  });
});
