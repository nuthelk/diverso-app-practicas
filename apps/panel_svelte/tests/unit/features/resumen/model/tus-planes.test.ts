import { describe, expect, it } from 'vitest';
import { tusPlanes } from '$lib/features/resumen/model/tus-planes';
import { fecha, plan } from '$tests/fixtures';

/** Martes 3-nov-2026, 12:00 en Bogotá. */
const MARTES = new Date(Date.UTC(2026, 10, 3, 17, 0, 0));

/** Un plan publicado con salidas de 24 cupos; `reservas[i]` personas en la salida i (días 5, 8, 11…). */
function conSalidas(titulo: string, reservas: number[], extra: object = {}) {
  const dias = ['2026-11-05', '2026-11-08', '2026-11-11', '2026-11-14'];
  return {
    ...plan(
      titulo,
      reservas.map((r, i) => fecha({ id: `${titulo}-${i}`, fecha: dias[i], cupo_total: 24, cupo_disponible: 24 - r })),
    ),
    ...extra,
  };
}

describe('tusPlanes · personas y ocupación del mes', () => {
  it('por plan publicado: personas, salidas y ocupación de sus salidas próximas de este mes', () => {
    const { planes } = tusPlanes([conSalidas('Río Claro', [5, 3, 4]), conSalidas('San Rafael', [2, 5])], MARTES);
    expect(planes.map((p) => [p.titulo, p.personas, p.salidas, p.ocupacion])).toEqual([
      ['Río Claro', 12, 3, 17], // 12 de 72 cupos
      ['San Rafael', 7, 2, 15], // 7 de 48
    ]);
  });

  it('solo cuenta las salidas de este mes (Bogotá) que aún no parten', () => {
    const p = conSalidas('Río Claro', [5, 3]);
    p.plan_dates.push(fecha({ id: 'pasada', fecha: '2026-11-01', cupo_total: 24, cupo_disponible: 0 })); // ya salió
    p.plan_dates.push(fecha({ id: 'hoy', fecha: '2026-11-03', cupo_total: 24, cupo_disponible: 0 })); // salió a las 06:00
    p.plan_dates.push(fecha({ id: 'dic', fecha: '2026-12-02', cupo_total: 24, cupo_disponible: 0 })); // otro mes
    const [r] = tusPlanes([p], MARTES).planes;
    expect([r.personas, r.salidas]).toEqual([8, 2]);
  });

  it('el mes lo define el día de Bogotá, no el del navegador', () => {
    // 31-oct 21:00 en Bogotá = 1-nov 02:00 UTC: sigue siendo octubre.
    const ahora = new Date(Date.UTC(2026, 10, 1, 2, 0, 0));
    const p = {
      ...plan('Mes', [
        fecha({ id: 'o', fecha: '2026-10-31', cupo_total: 10, cupo_disponible: 5 }),
        fecha({ id: 'n', fecha: '2026-11-05', cupo_total: 10, cupo_disponible: 0 }),
      ]),
      hora_salida: '22:00:00',
    };
    expect(tusPlanes([p], ahora).planes[0].personas).toBe(5);
  });

  it('no lista borradores y un plan sin salidas este mes lo dice sin entrar al ranking', () => {
    const vacio = conSalidas('Sin salidas', []);
    const { planes } = tusPlanes([conSalidas('Borrador', [5], { estado: 'borrador' }), vacio, conSalidas('Activo', [3])], MARTES);
    expect(planes.map((p) => [p.titulo, p.salidas, p.etiqueta])).toEqual([
      ['Activo', 1, null],
      ['Sin salidas', 0, null],
    ]);
  });

  it('la barra es proporcional al plan que más personas tiene', () => {
    const { planes } = tusPlanes([conSalidas('A', [12]), conSalidas('B', [6])], MARTES);
    expect(planes.map((p) => p.ancho)).toEqual([100, 50]);
  });

  it('cupos totales en cero no dividen por cero', () => {
    const p = plan('Cero', [fecha({ id: 'c', fecha: '2026-11-05', cupo_total: 0, cupo_disponible: 0 })]);
    expect(tusPlanes([p], MARTES).planes[0]).toMatchObject({ personas: 0, ocupacion: 0, ancho: 0 });
  });
});

describe('tusPlanes · «Vende más» y «Vende menos»', () => {
  it('con dos o más planes, el que más personas tiene vende más y el último vende menos', () => {
    const { planes, frase } = tusPlanes(
      [conSalidas('Medio', [5]), conSalidas('Mucho', [12]), conSalidas('Poco', [1])],
      MARTES,
    );
    expect(planes.map((p) => [p.titulo, p.etiqueta])).toEqual([
      ['Mucho', 'mas'],
      ['Medio', null],
      ['Poco', 'menos'],
    ]);
    expect(frase).toBe('Este mes se vende más Mucho; Poco vende menos.');
  });

  it('con un solo plan no hay etiquetas ni comparación', () => {
    const { planes, frase } = tusPlanes([conSalidas('Único', [5, 3])], MARTES);
    expect(planes[0].etiqueta).toBeNull();
    expect(frase).toBe('Este mes tienes 8 personas reservadas en 2 salidas.');
  });

  it('el empate en personas se desempata por ocupación', () => {
    // Mismas 6 personas, pero B las junta en una sola salida: más ocupada.
    const { planes } = tusPlanes([conSalidas('A', [3, 3]), conSalidas('B', [6])], MARTES);
    expect(planes.map((p) => [p.titulo, p.etiqueta])).toEqual([
      ['B', 'mas'],
      ['A', 'menos'],
    ]);
  });

  it('si todos van igual no se elige a nadie', () => {
    const { planes, frase } = tusPlanes([conSalidas('A', [4]), conSalidas('B', [4])], MARTES);
    expect(planes.map((p) => p.etiqueta)).toEqual([null, null]);
    expect(frase).toBe('Este mes tus planes van parejos: 4 personas cada uno.');
  });

  it('un empate arriba marca a todos los empatados y la frase los nombra juntos', () => {
    const { planes, frase } = tusPlanes([conSalidas('A', [8]), conSalidas('B', [8]), conSalidas('C', [2])], MARTES);
    expect(planes.map((p) => [p.titulo, p.etiqueta])).toEqual([
      ['A', 'mas'],
      ['B', 'mas'],
      ['C', 'menos'],
    ]);
    expect(frase).toBe('Este mes se venden más A y B; C vende menos.');
  });

  it('un plan sin salidas este mes no cuenta para comparar', () => {
    const { planes } = tusPlanes([conSalidas('Activo', [5]), conSalidas('Parado', [])], MARTES);
    expect(planes.map((p) => p.etiqueta)).toEqual([null, null]);
  });
});

describe('tusPlanes · sin datos', () => {
  it('sin planes publicados lo dice simple', () => {
    expect(tusPlanes([], MARTES)).toEqual({ planes: [], frase: 'Aún no tienes planes publicados.' });
    expect(tusPlanes([conSalidas('B', [1], { estado: 'borrador' })], MARTES).planes).toEqual([]);
  });

  it('con planes pero sin salidas este mes, también', () => {
    const { frase } = tusPlanes([conSalidas('A', [])], MARTES);
    expect(frase).toBe('Este mes no tienes salidas próximas.');
  });
});
