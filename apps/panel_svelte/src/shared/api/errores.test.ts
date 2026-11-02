import { describe, expect, it } from 'vitest';
import { mensajeError } from './errores';

describe('mensajeError', () => {
  it.each([
    ['NO_AUTORIZADO', /permiso/],
    ['SEMANA_NO_TERMINADA', /aún no termina/],
    ['CUENTA_NO_REGISTRADA', /cuenta para dispersiones/],
    ['LIQUIDACION_NO_PENDIENTE', /ya fue ejecutada/],
    ['MONTO_NO_POSITIVO', /cero o negativo/],
    ['FECHA_CON_RESERVAS', /reservas activas/],
    ['NOTAS_CON_POLITICA', /^Las notas no pueden contener reglas de reembolso; usa los campos de horas y porcentaje\.$/],
  ])('traduce %s', (codigo, esperado) => {
    expect(mensajeError(new Error(`${codigo}`))).toMatch(esperado);
  });

  it('un error desconocido se muestra tal cual', () => {
    expect(mensajeError(new Error('algo raro'))).toBe('algo raro');
  });
});
