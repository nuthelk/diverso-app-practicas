import { DiversoError, mensajeDeError } from '@/core/errors/diverso-error';
import { ErrorFuncion } from '@/core/errors/error-funcion';

import { errorPostgrest } from '../../support/errores';

/**
 * `create_booking` rechaza una segunda reserva pendiente del mismo viajero para la misma fecha
 * con `raise exception 'RESERVA_PENDIENTE_EXISTENTE' using detail = <id de la existente>`.
 */
describe('DiversoError.fromPostgrest', () => {
  test('RESERVA_PENDIENTE_EXISTENTE lleva el id de la reserva existente y un mensaje claro', () => {
    const e = DiversoError.fromPostgrest(
      errorPostgrest('RESERVA_PENDIENTE_EXISTENTE', {
        code: 'P0001',
        details: 'b0e1f2a3-0000-4000-8000-000000000001',
      }),
    );
    expect(e.codigo).toBe('RESERVA_PENDIENTE_EXISTENTE');
    expect(e.detalle?.['booking_id']).toBe('b0e1f2a3-0000-4000-8000-000000000001');
    expect(e.mensajeUsuario).toContain('reserva pendiente');
    expect(e.mensajeUsuario).toContain('esta fecha');
  });

  test('RESERVA_YA_SALIO (pagar o cancelar tras la salida) se reconoce y se explica', () => {
    const e = DiversoError.fromPostgrest(errorPostgrest('RESERVA_YA_SALIO', { code: 'P0001' }));
    expect(e.codigo).toBe('RESERVA_YA_SALIO');
    expect(e.mensajeUsuario).toBe(
      'Este viaje ya salió, así que la reserva ya no se puede pagar ni cancelar.',
    );
    // También cuando llega desde la Edge Function con {error, mensaje}.
    expect(new DiversoError('RESERVA_YA_SALIO').mensajeUsuario).toContain('ya salió');
  });

  test('PRESERVE: los códigos de antes se siguen reconociendo', () => {
    const e = DiversoError.fromPostgrest(errorPostgrest('SIN_CUPO', { code: 'P0001' }));
    expect(e.codigo).toBe('SIN_CUPO');
    expect(e.detalle).toBeNull();
    expect(e.mensajeUsuario).toContain('cupos');
    expect(DiversoError.fromPostgrest(errorPostgrest('algo raro')).codigo).toBe('ERROR_BD');
  });
});

describe('DiversoError.fromPostgrest (extra del port)', () => {
  test('busca el código por «contiene», en el orden de Dart, y conserva el mensaje recortado', () => {
    const e = DiversoError.fromPostgrest(errorPostgrest('  error: SIN_CUPO y PAX_INVALIDO  '));
    expect(e.codigo).toBe('SIN_CUPO');
    expect(e.mensaje).toBe('error: SIN_CUPO y PAX_INVALIDO');
  });

  test('RESERVA_PENDIENTE_EXISTENTE sin detail: detalle null', () => {
    expect(DiversoError.fromPostgrest(errorPostgrest('RESERVA_PENDIENTE_EXISTENTE')).detalle).toBeNull();
    expect(
      DiversoError.fromPostgrest(errorPostgrest('RESERVA_PENDIENTE_EXISTENTE', { details: '' })).detalle,
    ).toBeNull();
  });

  test('el error plano {message, code, details, hint} de supabase-js (sin throwOnError) también cuenta', () => {
    const e = DiversoError.fromPostgrest({ message: 'NO_ES_DUENO', code: 'P0001', details: null, hint: null });
    expect(e.codigo).toBe('NO_ES_DUENO');
  });

  test('lo que no es de PostgREST sale como ERROR_INESPERADO', () => {
    const e = DiversoError.fromPostgrest(new TypeError('Network request failed'));
    expect(e.codigo).toBe('ERROR_INESPERADO');
    expect(e.mensaje).toContain('Network request failed');
    expect(e).toBeInstanceOf(DiversoError);
    expect(e).toBeInstanceOf(Error);
  });
});

describe('DiversoError.fromFunction (orden de Dart)', () => {
  test('1. cuerpo {error, mensaje} con código: gana sobre el status', () => {
    const e = DiversoError.fromFunction(new ErrorFuncion(500, { error: 'RESERVA_VENCIDA', mensaje: 'x', y: 1 }));
    expect(e.codigo).toBe('RESERVA_VENCIDA');
    expect(e.mensaje).toBe('x');
    expect(e.detalle).toEqual({ error: 'RESERVA_VENCIDA', mensaje: 'x', y: 1 });
  });

  test('2. status 0 (sin red) → SIN_CONEXION', () => {
    expect(DiversoError.fromFunction(new ErrorFuncion(0, 'offline')).codigo).toBe('SIN_CONEXION');
  });

  test('3. status ≥ 500 sin código → ERROR_SERVIDOR; 4. el resto → ERROR_FUNCION', () => {
    expect(DiversoError.fromFunction(new ErrorFuncion(502, 'Bad gateway')).codigo).toBe('ERROR_SERVIDOR');
    expect(DiversoError.fromFunction(new ErrorFuncion(400, { otra: 'cosa' })).codigo).toBe('ERROR_FUNCION');
    expect(DiversoError.fromFunction(new ErrorFuncion(200, null)).codigo).toBe('ERROR_FUNCION');
  });

  test('aprobadoTarde solo con estado_pago = aprobado_tarde', () => {
    expect(
      DiversoError.fromFunction(new ErrorFuncion(409, { error: 'RESERVA_VENCIDA', estado_pago: 'aprobado_tarde' }))
        .aprobadoTarde,
    ).toBe(true);
    expect(new DiversoError('RESERVA_VENCIDA').aprobadoTarde).toBe(false);
  });
});

describe('mensajeDeError: tabla 1:1 con mensaje_usuario.dart', () => {
  test.each([
    ['SIN_CUPO', 'Se acabaron los cupos para esa fecha. Prueba otra fecha u otro plan.'],
    ['ESTADO_INVALIDO', 'La reserva ya no admite esta operación.'],
    ['NO_ES_DUENO', 'Esta reserva no te pertenece.'],
    ['AGENCIA_NO_VERIFICADA', 'La agencia debe estar verificada para publicar planes.'],
    [
      'AGENCIA_NO_HABILITADA',
      'Esta agencia no está habilitada para vender en este momento (verificación o RNT pendiente). Elige otro plan.',
    ],
    [
      'RNT_VENCIDO',
      'Esta agencia no está habilitada para vender en este momento (verificación o RNT pendiente). Elige otro plan.',
    ],
    ['FECHA_PASADA', 'Esa fecha ya pasó. Elige una salida próxima.'],
    ['FECHA_YA_SALIO', 'Esta salida ya partió. Elige otra fecha.'],
    ['PLAN_NO_PUBLICADO', 'Este plan ya no está disponible.'],
    [
      'RESERVA_PENDIENTE_EXISTENTE',
      'Ya tienes una reserva pendiente de pago para esta fecha. Complétala o cancélala para empezar de nuevo.',
    ],
    ['RESERVA_YA_SALIO', 'Este viaje ya salió, así que la reserva ya no se puede pagar ni cancelar.'],
    ['RESERVA_NO_EXISTE', 'No encontramos esa reserva.'],
    ['NO_AUTENTICADO', 'Tu sesión expiró. Inicia sesión de nuevo.'],
    ['RESERVA_VENCIDA', 'Tu reserva venció (los cupos se retienen 30 minutos). Vuelve a reservar.'],
    ['REDIRECT_NO_PERMITIDO', 'Esta dirección de la app no está autorizada para pagos de prueba.'],
    [
      'MONTO_NO_COINCIDE',
      'El monto de la transacción no coincide con el de tu reserva, así que no la confirmamos. Contacta a soporte con tu referencia.',
    ],
    ['TRANSACCION_NO_EXISTE', 'No encontramos ese pago. Si ya pagaste, toca «Ya pagué, verificar» en Mis reservas.'],
    ['REFERENCIA_DESCONOCIDA', 'No encontramos ese pago. Si ya pagaste, toca «Ya pagué, verificar» en Mis reservas.'],
    ['WOMPI_NO_DISPONIBLE', 'Wompi no está disponible en este momento. Intenta de nuevo en unos minutos.'],
    ['WOMPI_NO_AUTORIZADO', 'La pasarela de prueba rechazó las credenciales configuradas. Avisa al equipo de Diverso.'],
    ['SOLO_MODO_PRUEBA', 'La pasarela de prueba no está configurada.'],
    ['SIN_CONEXION', 'Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.'],
    ['ERROR_SERVIDOR', 'El servidor tuvo un problema. Intenta de nuevo en un momento.'],
    ['ERROR_INTERNO', 'El servidor tuvo un problema. Intenta de nuevo en un momento.'],
    ['CONFIG_SUPABASE', 'El servidor tuvo un problema. Intenta de nuevo en un momento.'],
    ['SERVICIO_NO_DISPONIBLE', 'El servidor tuvo un problema. Intenta de nuevo en un momento.'],
    ['ERROR_BD', 'Error de conexión. Revisa tu internet e intenta de nuevo.'],
    ['OTRO_CODIGO', 'Algo salió mal (OTRO_CODIGO). Intenta de nuevo.'],
  ])('%s', (codigo, texto) => {
    expect(mensajeDeError(new DiversoError(codigo))).toBe(texto);
  });

  test('RESERVA_VENCIDA con aprobación tardía nombra el estado del reembolso (o «en proceso»)', () => {
    const tarde = (reembolso: unknown) =>
      new DiversoError('RESERVA_VENCIDA', null, { estado_pago: 'aprobado_tarde', reembolso }).mensajeUsuario;
    expect(tarde('aprobado')).toBe(
      'Tu pago llegó cuando la reserva ya había vencido, así que no se confirmó. ' +
        'Te lo devolvemos automáticamente (reembolso de prueba aprobado).',
    );
    expect(tarde('pendiente')).toContain('(reembolso de prueba pendiente)');
    expect(tarde('rechazado')).toContain('(reembolso de prueba rechazado)');
    expect(tarde('no_aplica')).toContain('(reembolso de prueba en proceso)');
    expect(tarde(null)).toContain('(reembolso de prueba en proceso)');
  });

  test('toString / message conserva el código para los logs', () => {
    const e = new DiversoError('SIN_CUPO', 'detalle');
    expect(e.message).toBe('DiversoError(SIN_CUPO): detalle');
    expect(e.name).toBe('DiversoError');
  });
});
