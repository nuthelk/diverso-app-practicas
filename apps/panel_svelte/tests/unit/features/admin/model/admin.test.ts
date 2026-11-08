import { describe, expect, it } from 'vitest';
import {
  avisoAnticiposGenerados,
  avisoSemanaGenerada,
  consecuenciaAccion,
  etiquetaEnviar,
  vigenciaInicial,
} from '$lib/features/admin/model/admin';
import { agencia, HOY } from '$tests/fixtures';

describe('vigenciaInicial', () => {
  it('al renovar una vigencia vigente, propone el año siguiente a la actual', () => {
    const a = agencia({ rnt_vigente_hasta: '2027-03-31' });
    expect(vigenciaInicial(a, 'vigencia', HOY)).toBe('2028-03-31');
  });

  it('al renovar una vigencia vencida, propone según hoy', () => {
    const a = agencia({ rnt_vigente_hasta: '2026-10-20' });
    expect(vigenciaInicial(a, 'vigencia', HOY)).toBe('2027-03-31');
  });

  it('al verificar, propone según hoy aunque haya vigencia previa', () => {
    const a = agencia({ rnt_vigente_hasta: '2027-03-31' });
    expect(vigenciaInicial(a, 'verificar', HOY)).toBe('2027-03-31');
  });

  it('sin vigencia previa, propone según hoy', () => {
    const a = agencia({ rnt_vigente_hasta: null });
    expect(vigenciaInicial(a, 'vigencia', HOY)).toBe('2027-03-31');
  });
});

describe('avisoSemanaGenerada', () => {
  const periodo = { periodo_inicio: '2026-10-19', periodo_fin: '2026-10-25' };

  it('avisa que no había nada nuevo cuando no se generó ninguna', () => {
    expect(avisoSemanaGenerada({ ...periodo, liquidaciones: 0, items: 0 })).toBe(
      'Semana del 19 oct – 25 oct 2026: no había nada nuevo por liquidar.',
    );
  });

  it('resume cuántas liquidaciones e items se generaron', () => {
    expect(avisoSemanaGenerada({ ...periodo, liquidaciones: 3, items: 7 })).toBe(
      'Semana del 19 oct – 25 oct 2026: 3 liquidaciones con 7 items.',
    );
  });
});

describe('avisoAnticiposGenerados', () => {
  it('avisa que no había anticipos nuevos', () => {
    expect(avisoAnticiposGenerados({ liquidaciones: 0, items: 0 })).toBe(
      'No había anticipos nuevos por generar.',
    );
  });

  it('resume cuántas liquidaciones y reservas se generaron', () => {
    expect(avisoAnticiposGenerados({ liquidaciones: 2, items: 5 })).toBe(
      'Anticipos generados: 2 liquidaciones con 5 reservas.',
    );
  });
});

describe('etiquetaEnviar', () => {
  it('nombra la acción tal como ocurre, sin jerga', () => {
    expect(etiquetaEnviar(agencia({ estado_verificacion: 'pendiente' }), 'rechazar')).toBe('Rechazar agencia');
    expect(etiquetaEnviar(agencia({ estado_verificacion: 'verificado' }), 'rechazar')).toBe('Quitar verificación');
    expect(etiquetaEnviar(agencia(), 'verificar')).toBe('Verificar agencia');
    expect(etiquetaEnviar(agencia(), 'vigencia')).toBe('Guardar vigencia');
  });
});

describe('consecuenciaAccion', () => {
  it('quitar la verificación avisa que deja de vender y que verá el motivo', () => {
    expect(consecuenciaAccion(agencia({ estado_verificacion: 'verificado' }), 'rechazar', '')).toBe(
      'La agencia dejará de vender: sus planes dejan de mostrarse y de recibir reservas. Verá el motivo en su panel.',
    );
  });

  it('rechazar una agencia en verificación avisa que seguirá sin publicar y que verá el motivo', () => {
    expect(consecuenciaAccion(agencia({ estado_verificacion: 'pendiente' }), 'rechazar', '')).toBe(
      'La agencia seguirá sin poder publicar planes. Verá el motivo en su panel.',
    );
  });

  it('verificar dice hasta cuándo podrá vender, y si venía rechazada, que se quita el rechazo', () => {
    expect(consecuenciaAccion(agencia({ estado_verificacion: 'pendiente' }), 'verificar', '2027-03-31')).toBe(
      'La agencia podrá publicar planes y vender hasta el 31 de marzo de 2027.',
    );
    expect(consecuenciaAccion(agencia({ estado_verificacion: 'rechazado' }), 'verificar', '2027-03-31')).toBe(
      'Se quita el rechazo: la agencia podrá publicar planes y vender hasta el 31 de marzo de 2027.',
    );
  });

  it('sin fecha elegida no inventa una', () => {
    expect(consecuenciaAccion(agencia({ estado_verificacion: 'pendiente' }), 'verificar', '')).toBe(
      'La agencia podrá publicar planes y vender mientras el RNT esté vigente.',
    );
  });

  it('renovar la vigencia solo cambia la fecha: la agencia sigue verificada', () => {
    expect(consecuenciaAccion(agencia(), 'vigencia', '2028-03-31')).toBe(
      'La agencia seguirá vendiendo hasta el 31 de marzo de 2028.',
    );
  });
});
