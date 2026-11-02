import { describe, expect, it } from 'vitest';
import {
  AVISO_PRUEBA,
  enmascararCuenta,
  etiquetaEstadoLiquidacion,
  etiquetaTipoItem,
  etiquetaTipoCuenta,
  etiquetaTipoLiquidacion,
  filtrarLiquidaciones,
  lunesDeSemana,
  normalizarCuenta,
  notaEstado,
  periodoTexto,
  puedeEjecutarse,
  rangoSemana,
  resumenLiquidaciones,
  semanaAnterior,
  semanaTerminada,
  textoCuenta,
  validarCuenta,
  type CuentaDispersion,
} from './liquidaciones';
import { cuentaResumen, liquidacion } from '$tests/fixtures';

const cuenta: CuentaDispersion = {
  banco: 'Bancolombia',
  tipo_cuenta: 'ahorros',
  numero_cuenta: '12345678904321',
  titular: 'EcoAndes SAS',
  tipo_documento: 'NIT',
  numero_documento: '9001234567',
};

describe('textos', () => {
  it('el aviso de prueba dice que no se mueve dinero real', () => {
    expect(AVISO_PRUEBA).toBe('Dispersión de prueba — no se mueve dinero real');
  });

  it('etiquetas de tipo y estado', () => {
    expect(etiquetaTipoLiquidacion('semanal')).toBe('Semanal');
    expect(etiquetaTipoLiquidacion('anticipo')).toBe('Anticipo');
    expect(etiquetaEstadoLiquidacion('pendiente')).toBe('Pendiente');
    expect(etiquetaEstadoLiquidacion('pagada_prueba')).toBe('Pagada (prueba)');
    expect(etiquetaEstadoLiquidacion('anulada')).toBe('Anulada');
    expect(etiquetaTipoItem('servicio')).toBe('Servicio');
    expect(etiquetaTipoItem('anticipo')).toBe('Anticipo 30 %');
    expect(etiquetaTipoItem('ajuste')).toBe('Ajuste por reembolso');
  });

  it('un estado desconocido se muestra tal cual', () => {
    expect(etiquetaEstadoLiquidacion('otro')).toBe('otro');
  });
});

describe('periodoTexto', () => {
  it('un rango de la misma semana', () => {
    expect(periodoTexto('2026-02-02', '2026-02-08')).toBe('2 feb – 8 feb 2026');
  });
  it('un solo día (anticipos de una fecha)', () => {
    expect(periodoTexto('2026-02-04', '2026-02-04')).toBe('4 feb 2026');
  });
  it('cruza de año', () => {
    expect(periodoTexto('2025-12-29', '2026-01-04')).toBe('29 dic 2025 – 4 ene 2026');
  });
});

describe('enmascararCuenta', () => {
  it('solo deja los 4 últimos dígitos', () => {
    expect(enmascararCuenta('12345678904321')).toBe('•••• 4321');
    expect(enmascararCuenta('3001234567')).toBe('•••• 4567');
  });
  it('no revela cuentas cortas ni vacías', () => {
    expect(enmascararCuenta('1234')).toBe('••••');
    expect(enmascararCuenta('')).toBe('••••');
    expect(enmascararCuenta(null)).toBe('••••');
  });
  it('nunca incluye el número completo', () => {
    expect(enmascararCuenta('12345678904321')).not.toContain('1234567890');
  });
});

describe('normalizarCuenta', () => {
  it('recorta espacios y deja solo dígitos en el número de cuenta', () => {
    expect(
      normalizarCuenta({
        ...cuenta,
        banco: '  Bancolombia ',
        numero_cuenta: '1234 5678-9043 21',
        titular: ' EcoAndes SAS ',
        numero_documento: '900.123.456 -7',
      }),
    ).toEqual({
      ...cuenta,
      numero_cuenta: '123456789043' + '21',
      numero_documento: '900123456-7',
    });
  });
});

describe('validarCuenta', () => {
  it('una cuenta válida no tiene errores', () => {
    expect(validarCuenta(cuenta)).toEqual({});
    expect(validarCuenta({ ...cuenta, tipo_cuenta: 'corriente', tipo_documento: 'CC', numero_documento: '1037000111' })).toEqual({});
  });

  it('acepta espacios y guiones en el número (se normalizan)', () => {
    expect(validarCuenta({ ...cuenta, numero_cuenta: '1234-5678 9043' })).toEqual({});
  });

  it.each([
    ['banco', { banco: '' }, /banco/i],
    ['banco', { banco: 'A' }, /banco/i],
    ['numero_cuenta', { numero_cuenta: '12345' }, /6 a 20 dígitos/],
    ['numero_cuenta', { numero_cuenta: '1'.repeat(21) }, /6 a 20 dígitos/],
    ['numero_cuenta', { numero_cuenta: '12ab5678' }, /solo dígitos/],
    ['titular', { titular: 'Al' }, /titular/i],
    ['tipo_cuenta', { tipo_cuenta: 'ahorro' }, /tipo de cuenta/i],
    ['tipo_documento', { tipo_documento: 'RUT' }, /tipo de documento/i],
    ['numero_documento', { numero_documento: '12' }, /documento/i],
    ['numero_documento', { numero_documento: '12#45678' }, /documento/i],
  ] as const)('rechaza %s inválido', (campo, cambio, mensaje) => {
    const errores = validarCuenta({ ...cuenta, ...cambio } as CuentaDispersion);
    expect(errores[campo]).toMatch(mensaje);
  });

  it('informa todos los campos inválidos a la vez', () => {
    const errores = validarCuenta({
      banco: '',
      tipo_cuenta: '' as never,
      numero_cuenta: '',
      titular: '',
      tipo_documento: '' as never,
      numero_documento: '',
    });
    expect(Object.keys(errores).sort()).toEqual(
      ['banco', 'numero_cuenta', 'numero_documento', 'tipo_cuenta', 'tipo_documento', 'titular'].sort(),
    );
  });
});

describe('resumenLiquidaciones', () => {
  it('suma lo pendiente y lo dispersado en prueba; ignora las anuladas', () => {
    const r = resumenLiquidaciones([
      liquidacion({ id: 'a', estado: 'pendiente', monto_a_pagar: 100000 }),
      liquidacion({ id: 'b', estado: 'pendiente', monto_a_pagar: 50000 }),
      liquidacion({ id: 'c', estado: 'pagada_prueba', monto_a_pagar: 70000 }),
      liquidacion({ id: 'd', estado: 'anulada', monto_a_pagar: 999 }),
    ]);
    expect(r).toEqual({ pendiente: 150000, pagadoPrueba: 70000 });
  });
  it('sin liquidaciones, ceros', () => {
    expect(resumenLiquidaciones([])).toEqual({ pendiente: 0, pagadoPrueba: 0 });
  });
});

describe('semanas (lunes a domingo)', () => {
  it('lunesDeSemana', () => {
    expect(lunesDeSemana('2026-02-02')).toBe('2026-02-02'); // lunes
    expect(lunesDeSemana('2026-02-04')).toBe('2026-02-02'); // miércoles
    expect(lunesDeSemana('2026-02-08')).toBe('2026-02-02'); // domingo
    expect(lunesDeSemana('2026-02-09')).toBe('2026-02-09');
    expect(lunesDeSemana('2026-01-01')).toBe('2025-12-29'); // cruza de año
  });

  it('rangoSemana', () => {
    expect(rangoSemana('2026-02-05')).toEqual({ inicio: '2026-02-02', fin: '2026-02-08' });
  });

  it('semanaAnterior es el lunes de la semana pasada', () => {
    expect(semanaAnterior(new Date(2026, 1, 9, 6, 0))).toBe('2026-02-02'); // lunes 9 → lunes 2
    expect(semanaAnterior(new Date(2026, 1, 8, 23, 0))).toBe('2026-01-26'); // domingo 8 → lunes 26 ene
    expect(semanaAnterior(new Date(2026, 9, 25, 12, 0))).toBe('2026-10-12'); // domingo 25 oct
  });

  it('una semana solo se liquida cuando ya terminó', () => {
    expect(semanaTerminada('2026-02-02', new Date(2026, 1, 9, 6, 0))).toBe(true); // lunes siguiente
    expect(semanaTerminada('2026-02-02', new Date(2026, 1, 8, 23, 59))).toBe(false); // domingo
    expect(semanaTerminada('2026-02-04', new Date(2026, 1, 4, 12, 0))).toBe(false); // en curso
    expect(semanaTerminada('2026-02-09', new Date(2026, 1, 12, 12, 0))).toBe(false); // en curso
  });
});

describe('textoCuenta', () => {
  it('banco, tipo y solo los 4 últimos dígitos', () => {
    expect(textoCuenta(cuentaResumen())).toBe('Bancolombia · Ahorros •••• 4321');
    expect(textoCuenta(cuentaResumen({ tipo_cuenta: 'corriente', ultimos4: '9988' }))).toBe('Bancolombia · Corriente •••• 9988');
  });
  it('sin cuenta registrada', () => {
    expect(textoCuenta(null)).toBe('Sin cuenta registrada');
    expect(textoCuenta(undefined)).toBe('Sin cuenta registrada');
  });
  it('etiquetaTipoCuenta', () => {
    expect(etiquetaTipoCuenta('ahorros')).toBe('Ahorros');
    expect(etiquetaTipoCuenta('corriente')).toBe('Corriente');
  });
});

describe('filtrarLiquidaciones', () => {
  const ls = [
    liquidacion({ id: 'a', estado: 'pendiente' }),
    liquidacion({ id: 'b', estado: 'pagada_prueba' }),
    liquidacion({ id: 'c', estado: 'anulada' }),
    liquidacion({ id: 'd', estado: 'pendiente' }),
  ];
  const ids = (f: Parameters<typeof filtrarLiquidaciones>[1]) => filtrarLiquidaciones(ls, f).map((l) => l.id);
  it('pendientes, pagadas (prueba) y todas', () => {
    expect(ids('pendientes')).toEqual(['a', 'd']);
    expect(ids('pagadas')).toEqual(['b']);
    expect(ids('todas')).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('estados y conceptos de las retenciones y saldos', () => {
  it('etiquetas de los estados nuevos', () => {
    expect(etiquetaEstadoLiquidacion('compensada')).toBe('Compensada');
    expect(etiquetaEstadoLiquidacion('sin_saldo')).toBe('Sin saldo');
  });

  it('etiquetas de los conceptos nuevos', () => {
    expect(etiquetaTipoItem('retencion')).toBe('Retención por cancelación');
    expect(etiquetaTipoItem('saldo_anterior')).toBe('Saldo de liquidación anterior');
  });

  it('solo una liquidación pendiente con saldo a favor se puede ejecutar', () => {
    expect(puedeEjecutarse(liquidacion({ estado: 'pendiente', monto_a_pagar: 1000 }))).toBe(true);
    expect(puedeEjecutarse(liquidacion({ estado: 'pendiente', monto_a_pagar: 0 }))).toBe(false);
    expect(puedeEjecutarse(liquidacion({ estado: 'pendiente', monto_a_pagar: -8800 }))).toBe(false);
    for (const estado of ['pagada_prueba', 'anulada', 'compensada', 'sin_saldo'] as const) {
      expect(puedeEjecutarse(liquidacion({ estado, monto_a_pagar: 1000 }))).toBe(false);
    }
  });

  it('notaEstado explica qué pasa con cada liquidación que no se ejecuta', () => {
    expect(notaEstado(liquidacion({ estado: 'pendiente', monto_a_pagar: 1000 }))).toBeNull();
    expect(notaEstado(liquidacion({ estado: 'pagada_prueba' }))).toBeNull();
    expect(notaEstado(liquidacion({ estado: 'pendiente', monto_a_pagar: -8800 }))).toBe(
      'Saldo negativo: se descontará automáticamente de la próxima liquidación semanal.',
    );
    expect(notaEstado(liquidacion({ estado: 'sin_saldo', monto_a_pagar: 0 }))).toBe(
      'Sin saldo por dispersar: los anticipos ya cubrieron este periodo.',
    );
    expect(notaEstado(liquidacion({ estado: 'compensada', monto_a_pagar: -8800, compensada_en: 'liq-9' }))).toBe(
      'Compensada: su saldo se descontó en otra liquidación.',
    );
  });

  it('el resumen y los filtros no cuentan lo compensado ni lo que no tiene saldo', () => {
    const ls = [
      liquidacion({ id: 'a', estado: 'pendiente', monto_a_pagar: 100000 }),
      liquidacion({ id: 'b', estado: 'compensada', monto_a_pagar: -8800, compensada_en: 'a' }),
      liquidacion({ id: 'c', estado: 'sin_saldo', monto_a_pagar: 0 }),
      liquidacion({ id: 'd', estado: 'pagada_prueba', monto_a_pagar: 50000 }),
    ];
    expect(resumenLiquidaciones(ls)).toEqual({ pendiente: 100000, pagadoPrueba: 50000 });
    expect(filtrarLiquidaciones(ls, 'pendientes').map((l) => l.id)).toEqual(['a']);
    expect(filtrarLiquidaciones(ls, 'pagadas').map((l) => l.id)).toEqual(['d']);
    expect(filtrarLiquidaciones(ls, 'todas').map((l) => l.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});
