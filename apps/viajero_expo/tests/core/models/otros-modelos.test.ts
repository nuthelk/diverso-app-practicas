import { CreatedBooking } from '@/core/models/created-booking';
import { UserRole, VerificationStatus } from '@/core/models/enums';
import { CheckoutIniciado, EstadoPago, PagoVerificado } from '@/core/models/pago';
import { ItinerarioPaso, Plan, PlanDate } from '@/core/models/plan';
import { Agency, Profile } from '@/core/models/profile';
import { EstadoReembolso, ResultadoCancelacion } from '@/core/models/reembolso';
import { Review } from '@/core/models/review';
import { fechaLocal, fechaUtc } from '@/core/utils/fechas';

/** Modelos sin test en el núcleo Dart: mapeo de columnas y valores por defecto. */
describe('Profile y Agency', () => {
  test('Profile: rol por defecto viajero y nombre vacío', () => {
    const p = Profile.fromMap({ id: 'u' });
    expect(p).toMatchObject({ id: 'u', rol: UserRole.viajero, nombre: '', telefono: null });
    expect(Profile.fromMap({ id: 'u', rol: 'admin', nombre: 'Ana', telefono: '300' }).rol).toBe(UserRole.admin);
  });

  test('Agency: columnas, defaults y RNT como fecha local', () => {
    const a = Agency.fromMap({ id: 'a', nombre: 'Rutas', numero_rnt: '123', rnt_vigente_hasta: '2027-01-15' });
    expect(a).toMatchObject({
      id: 'a',
      ownerUserId: null,
      nombre: 'Rutas',
      descripcion: '',
      numeroRnt: '123',
      matriculaCamaraComercio: '',
      ciudad: 'Medellín',
      estadoVerificacion: VerificationStatus.pendiente,
      comisionPct: 12,
      logoUrl: null,
    });
    expect(a.rntVigenteHasta).toEqual(fechaLocal(2027, 1, 15));
    expect(Agency.fromMap({ id: 'a', nombre: 'R', numero_rnt: '1', rnt_vigente_hasta: 'xx' }).rntVigenteHasta).toBeNull();
  });

  test('verificada: estado verificado y RNT vigente hasta hoy inclusive (fecha del teléfono)', () => {
    const hoy = new Date();
    const dia = (delta: number) => fechaLocal(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate() + delta);
    const agencia = (estado: VerificationStatus, hasta: Date | null) =>
      new Agency({
        id: 'a',
        nombre: 'R',
        numeroRnt: '1',
        matriculaCamaraComercio: '',
        estadoVerificacion: estado,
        rntVigenteHasta: hasta,
      });
    expect(agencia(VerificationStatus.verificado, dia(0)).verificada).toBe(true);
    expect(agencia(VerificationStatus.verificado, dia(-1)).verificada).toBe(false);
    expect(agencia(VerificationStatus.verificado, null).verificada).toBe(false);
    expect(agencia(VerificationStatus.pendiente, dia(30)).verificada).toBe(false);
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
      categoria: 'aventura',
      estado: 'borrador',
      duracionTexto: '1 día',
      duracionHoras: 12,
      horaSalidaMinutos: 360,
      incluye: [],
      ratingPromedio: 0,
      reviewsCount: 0,
      fotoPrincipal: 'https://f/1.jpg',
      esNuevo: true,
    });
    expect(p.agency?.nombre).toBe('Rutas');
    expect(p.itinerario.map((i) => i.toMap())).toEqual([
      { hora: '06:00', actividad: 'Salida' },
      { hora: '', actividad: '' },
    ]);
    expect(Plan.fromMap({ id: 'p', agency_id: 'a', titulo: 'T', destino: 'D', precio_cop: 1 }).fotoPrincipal).toBeNull();
  });

  test('PlanDate: tieneCupos y toInsertMap con fecha YYYY-MM-DD', () => {
    const d = new PlanDate({ id: 'd', planId: 'p', fecha: fechaLocal(2026, 3, 7), cupoTotal: 10, cupoDisponible: 0 });
    expect(d.tieneCupos).toBe(false);
    expect(d.toInsertMap()).toEqual({ plan_id: 'p', fecha: '2026-03-07', cupo_total: 10, cupo_disponible: 0 });
    expect(new ItinerarioPaso({ hora: '7', actividad: 'a' }).toMap()).toEqual({ hora: '7', actividad: 'a' });
  });
});

describe('pagos, cancelación y reseñas', () => {
  test('CheckoutIniciado: monto en pesos y vencimiento como instante', () => {
    const c = CheckoutIniciado.fromMap({
      checkout_url: 'u',
      referencia: 'DIV-1-1',
      amount_in_cents: 30000000,
      expira_at: '2026-10-25T10:30:00-05:00',
    });
    expect(c.monto).toBe(300000);
    expect(c.expiraAt).toEqual(fechaUtc(2026, 10, 25, 15, 30));
  });

  test('PagoVerificado: estado desconocido → error; método desconocido → otro; mensajes', () => {
    const p = PagoVerificado.fromMap({
      estado_pago: 'raro',
      metodo: 'BITCOIN',
      referencia: 'r',
      booking: { id: 'b', codigo: 'C', estado: 'confirmada' },
    });
    expect(p.estado).toBe(EstadoPago.error);
    expect(p.metodo).toBe('otro');
    expect(p.mensajeUsuario).toBe(
      'Wompi no pudo procesar el pago de prueba. Puedes intentar de nuevo mientras tu reserva siga vigente (30 minutos).',
    );
    const con = (estado: string) =>
      PagoVerificado.fromMap({ estado_pago: estado, booking: { id: 'b', codigo: 'C' } }).mensajeUsuario;
    expect(con('aprobado')).toBe('¡Pago de prueba aprobado! Tu reserva está confirmada.');
    expect(con('rechazado')).toBe(
      'Wompi rechazó el pago de prueba (fondos, datos o el resultado del banco). ' +
        'Puedes intentar de nuevo mientras tu reserva siga vigente (30 minutos).',
    );
    expect(con('pendiente')).toBe(
      'Tu pago de prueba sigue pendiente. Te avisaremos en Mis reservas cuando Wompi lo confirme.',
    );
  });

  test('ResultadoCancelacion lee el objeto reembolso', () => {
    const r = ResultadoCancelacion.fromMap({
      estado: 'cancelada',
      reembolso: { aplica: true, porcentaje: 100, monto: 300000, estado: 'pendiente', motivo: 'm' },
    });
    expect(r).toMatchObject({ aplica: true, porcentaje: 100, monto: 300000, estado: EstadoReembolso.pendiente, motivo: 'm' });
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
    expect(Review.fromMap({ ...base, profiles: { nombre: 'Ana' } }).viajeroNombre).toBe('Ana');
    const ajena = Review.fromMap({ ...base, profiles: null });
    expect(ajena.viajeroNombre).toBeNull();
    expect(ajena.comentario).toBeNull();
    expect(ajena.createdAt).toEqual(fechaUtc(2026, 10, 25, 10));
  });

  test('CreatedBooking guarda lo que devuelve create_booking', () => {
    const c = new CreatedBooking({ bookingId: 'b', codigo: 'C', montoTotal: 1, planTitulo: '' });
    expect(c.fecha).toBeNull();
  });
});
