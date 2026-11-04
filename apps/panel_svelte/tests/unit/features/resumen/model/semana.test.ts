import { describe, expect, it } from 'vitest';
import {
  masAdelante,
  salidaPorDefecto,
  semanaDeSalidas,
  siguienteBloque,
} from '$lib/features/resumen/model/semana';
import { enZona, fecha, plan } from '$tests/fixtures';

/** Martes 3-nov-2026, 12:00 en Bogotá: la semana es la del lunes 2 al domingo 8 de noviembre. */
const MARTES = new Date(Date.UTC(2026, 10, 3, 17, 0, 0));

const rio = {
  ...plan('Río Claro 2 días con hospedaje', [
    fecha({ id: 'rc5', fecha: '2026-11-05', cupo_total: 24, cupo_disponible: 19 }),
    fecha({ id: 'rc8', fecha: '2026-11-08', cupo_total: 24, cupo_disponible: 21 }),
    fecha({ id: 'rc11', fecha: '2026-11-11', cupo_total: 24, cupo_disponible: 20 }),
  ]),
  id: 'rc',
  hora_salida: '06:30:00',
};
const san = {
  ...plan('Cascadas de San Rafael', [
    fecha({ id: 'sr8', fecha: '2026-11-08', cupo_total: 24, cupo_disponible: 22 }),
    fecha({ id: 'sr11', fecha: '2026-11-11', cupo_total: 24, cupo_disponible: 19 }),
  ]),
  id: 'sr',
  hora_salida: '06:00:00',
};
const planes = [rio, san];

describe('semanaDeSalidas · límites de la semana', () => {
  it('va de lunes a domingo y se escribe «Del 2 al 8 de noviembre»', () => {
    const s = semanaDeSalidas(planes, 0, MARTES);
    expect(s.inicio).toBe('2026-11-02');
    expect(s.fin).toBe('2026-11-08');
    expect(s.rango).toBe('Del 2 al 8 de noviembre');
    expect(s.dias.map((d) => `${d.abreviatura} ${d.numero}`)).toEqual([
      'lun 2', 'mar 3', 'mié 4', 'jue 5', 'vie 6', 'sáb 7', 'dom 8',
    ]);
  });

  it('la semana siguiente empieza el lunes 9', () => {
    const s = semanaDeSalidas(planes, 1, MARTES);
    expect([s.inicio, s.fin, s.rango]).toEqual(['2026-11-09', '2026-11-15', 'Del 9 al 15 de noviembre']);
  });

  it('si cruza de mes dice los dos meses', () => {
    const s = semanaDeSalidas([], 0, new Date(Date.UTC(2026, 9, 28, 17)));
    expect(s.rango).toBe('Del 26 de octubre al 1 de noviembre');
  });

  it('el domingo todavía es de la semana que termina (lunes anterior)', () => {
    const domingo = new Date(Date.UTC(2026, 10, 8, 17));
    expect(semanaDeSalidas([], 0, domingo).inicio).toBe('2026-11-02');
  });

  it('cuenta el día de Bogotá aunque el navegador ya esté en el lunes siguiente', () => {
    // Domingo 8-nov 23:30 en Bogotá = lunes 9-nov 04:30 UTC = lunes 17:30 en Auckland.
    const ahora = new Date(Date.UTC(2026, 10, 9, 4, 30));
    for (const zona of ['America/Bogota', 'Pacific/Auckland', 'Asia/Tokyo', 'Pacific/Kiritimati']) {
      const s = enZona(zona, () => semanaDeSalidas(planes, 0, ahora));
      expect([s.inicio, s.fin], zona).toEqual(['2026-11-02', '2026-11-08']);
      expect(s.dias.find((d) => d.hoy)?.numero, zona).toBe(8);
    }
  });

  it('marca hoy y los días anteriores como pasados', () => {
    const s = semanaDeSalidas(planes, 0, MARTES);
    expect(s.dias.map((d) => [d.numero, d.hoy, d.pasado])).toEqual([
      [2, false, true], [3, true, false], [4, false, false], [5, false, false],
      [6, false, false], [7, false, false], [8, false, false],
    ]);
  });

  it('en la semana siguiente no hay hoy ni días pasados', () => {
    const s = semanaDeSalidas(planes, 1, MARTES);
    expect(s.dias.some((d) => d.hoy || d.pasado)).toBe(false);
  });
});

describe('semanaDeSalidas · bloques', () => {
  const s = semanaDeSalidas(planes, 0, MARTES);
  const dia = (n: number) => s.dias.find((d) => d.numero === n)!;

  it('cada día lista sus salidas por hora, con plan, hora y «N de M», «K libres»', () => {
    expect(dia(5).salidas).toHaveLength(1);
    expect(dia(5).salidas[0]).toMatchObject({
      id: 'rc5', planId: 'rc', titulo: 'Río Claro 2 días con hospedaje', hora: '06:30', reservados: 5, total: 24, libres: 19,
    });
    // el 8: San Rafael sale a las 06:00 y Río Claro a las 06:30
    expect(dia(8).salidas.map((x) => [x.id, x.hora])).toEqual([['sr8', '06:00'], ['rc8', '06:30']]);
  });

  it('el relleno es lo reservado sobre el cupo total (redondeado)', () => {
    expect(dia(5).salidas[0].porcentaje).toBe(21); // 5 de 24
    expect(dia(8).salidas[0].porcentaje).toBe(8); // 2 de 24
  });

  it('una salida llena rellena el 100 % y un cupo total de cero no divide por cero', () => {
    const llena = { ...plan('Llena', [fecha({ id: 'l', fecha: '2026-11-04', cupo_total: 10, cupo_disponible: 0 })]), id: 'l' };
    const cero = { ...plan('Cero', [fecha({ id: 'c', fecha: '2026-11-04', cupo_total: 0, cupo_disponible: 0 })]), id: 'c' };
    const [b, a] = semanaDeSalidas([llena, cero], 0, MARTES).dias[2].salidas;
    expect([a.porcentaje, a.libres, b.porcentaje]).toEqual([100, 0, 0]);
  });

  it('los días sin salidas quedan vacíos (la pantalla dice «Sin salidas»)', () => {
    expect(dia(2).salidas).toEqual([]);
    expect(dia(4).salidas).toEqual([]);
  });

  it('las salidas que ya partieron siguen en su día, marcadas como ya salidas (no se esconden)', () => {
    // Martes 3-nov 12:00 Bogotá: la de las 06:00 de hoy ya salió; la de mañana no.
    const hoy = { ...plan('Hoy', [fecha({ id: 'h', fecha: '2026-11-03' }), fecha({ id: 'm', fecha: '2026-11-04' })]), id: 'h' };
    const sem = semanaDeSalidas([hoy], 0, MARTES);
    expect(sem.dias[1].salidas.map((x) => [x.id, x.yaSalio])).toEqual([['h', true]]);
    expect(sem.dias[2].salidas.map((x) => [x.id, x.yaSalio])).toEqual([['m', false]]);
  });

  it('un día pasado también conserva sus salidas', () => {
    const ayer = { ...plan('Ayer', [fecha({ id: 'a', fecha: '2026-11-02' })]), id: 'a' };
    const sem = semanaDeSalidas([ayer], 0, MARTES);
    expect(sem.dias[0].salidas.map((x) => [x.id, x.yaSalio])).toEqual([['a', true]]);
  });

  it('el borrador solo aparece si ya tiene personas reservadas', () => {
    const borrador = {
      ...plan('Borrador', [
        fecha({ id: 'b1', fecha: '2026-11-04', cupo_total: 10, cupo_disponible: 10 }),
        fecha({ id: 'b2', fecha: '2026-11-06', cupo_total: 10, cupo_disponible: 7 }),
      ]),
      id: 'b',
      estado: 'borrador' as const,
    };
    const sem = semanaDeSalidas([borrador], 0, MARTES);
    expect(sem.dias.flatMap((d) => d.salidas.map((x) => x.id))).toEqual(['b2']);
  });

  it('describe cada bloque para el lector de pantalla', () => {
    expect(dia(5).salidas[0].descripcion).toBe(
      'Río Claro 2 días con hospedaje, Jueves 5 de noviembre, 06:30: 5 de 24 cupos reservados.',
    );
  });
});

describe('masAdelante · lo que viene después de la semana mostrada', () => {
  it('es la primera fecha con salidas después del domingo, con todas sus salidas', () => {
    const m = masAdelante(planes, '2026-11-08', MARTES)!;
    expect(m.fecha).toBe('2026-11-11');
    expect(m.dia).toBe('mié 11 nov');
    expect(m.texto).toBe('mié 11 nov: Cascadas de San Rafael (5 de 24) y Río Claro 2 días con hospedaje (4 de 24)');
    expect(m.salidas.map((x) => `${x.titulo} ${x.reservados} de ${x.total}`)).toEqual([
      'Cascadas de San Rafael 5 de 24',
      'Río Claro 2 días con hospedaje 4 de 24',
    ]);
    expect(m.enSiguienteSemana).toBe(true);
  });

  it('desde la semana siguiente apunta más lejos y ya no ofrece «ver la siguiente»', () => {
    const lejos = { ...plan('Lejos', [fecha({ id: 'z', fecha: '2026-12-20' })]), id: 'z' };
    const m = masAdelante([lejos], '2026-11-08', MARTES)!;
    expect(m).toMatchObject({ fecha: '2026-12-20', dia: 'dom 20 dic', enSiguienteSemana: false });
  });

  it('sin nada después es null', () => {
    expect(masAdelante(planes, '2026-11-15', MARTES)).toBeNull();
  });
});

describe('salidaPorDefecto', () => {
  it('es la primera salida de la semana que aún no parte', () => {
    const hoy = { ...plan('Hoy', [fecha({ id: 'h', fecha: '2026-11-03' })]), id: 'h' }; // ya salió (06:00)
    const sem = semanaDeSalidas([hoy, rio, san], 0, MARTES);
    expect(salidaPorDefecto(sem)).toBe('rc5');
  });

  it('en la semana siguiente es la primera de la semana', () => {
    expect(salidaPorDefecto(semanaDeSalidas(planes, 1, MARTES))).toBe('sr11');
  });

  it('sin salidas próximas en la semana no hay selección', () => {
    const ayer = { ...plan('Ayer', [fecha({ id: 'a', fecha: '2026-11-02' })]), id: 'a' };
    expect(salidaPorDefecto(semanaDeSalidas([ayer], 0, MARTES))).toBeNull();
    expect(salidaPorDefecto(semanaDeSalidas([], 0, MARTES))).toBeNull();
  });
});

describe('siguienteBloque · flechas del teclado', () => {
  // jue 5: rc5 · dom 8: sr8, rc8
  const sem = semanaDeSalidas(planes, 0, MARTES);

  it('derecha e izquierda saltan al día vecino que tiene salidas', () => {
    expect(siguienteBloque(sem, 'rc5', 'ArrowRight')).toBe('sr8');
    expect(siguienteBloque(sem, 'sr8', 'ArrowLeft')).toBe('rc5');
  });

  it('al cambiar de día intenta mantener la misma posición', () => {
    expect(siguienteBloque(sem, 'rc8', 'ArrowLeft')).toBe('rc5'); // no hay segunda: la última
  });

  it('abajo y arriba recorren las salidas del mismo día', () => {
    expect(siguienteBloque(sem, 'sr8', 'ArrowDown')).toBe('rc8');
    expect(siguienteBloque(sem, 'rc8', 'ArrowUp')).toBe('sr8');
  });

  it('en los extremos se queda donde está', () => {
    expect(siguienteBloque(sem, 'rc5', 'ArrowLeft')).toBe('rc5');
    expect(siguienteBloque(sem, 'rc8', 'ArrowRight')).toBe('rc8');
    expect(siguienteBloque(sem, 'rc8', 'ArrowDown')).toBe('rc8');
    expect(siguienteBloque(sem, 'rc5', 'ArrowUp')).toBe('rc5');
  });

  it('Inicio y Fin van a la primera y a la última salida de la semana', () => {
    expect(siguienteBloque(sem, 'sr8', 'Home')).toBe('rc5');
    expect(siguienteBloque(sem, 'rc5', 'End')).toBe('rc8');
  });

  it('una salida que no está en la semana devuelve la primera', () => {
    expect(siguienteBloque(sem, 'nope', 'ArrowRight')).toBe('rc5');
  });

  it('sin salidas no hay a dónde ir', () => {
    expect(siguienteBloque(semanaDeSalidas([], 0, MARTES), 'x', 'ArrowRight')).toBeNull();
  });
});
