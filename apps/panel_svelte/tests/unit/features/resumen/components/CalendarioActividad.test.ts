import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import CalendarioActividad from '$lib/features/resumen/components/CalendarioActividad.svelte';
import { actividadPorDia } from '$lib/features/resumen/model/calendario';
import {
  periodoDeDia,
  periodoDeRango,
  periodoDeSemana,
  periodoInicial,
  periodoPredefinido,
  type Periodo,
} from '$lib/features/resumen/model/periodo';
import { texto } from '$tests/fixtures';

/** Miércoles 11-nov-2026, 12:00 en Bogotá. */
const HOY = new Date(Date.UTC(2026, 10, 11, 17, 0, 0));

/** Jueves 5: dos salidas (5 + 7 = 12 viajeros, nivel 2); lunes 9: 24 (nivel 3); jueves 12: 4 (nivel 1); sábado 14: sin reservas. */
const actividad = actividadPorDia([
  { fecha: '2026-11-05', reservados: 5 },
  { fecha: '2026-11-05', reservados: 7 },
  { fecha: '2026-11-09', reservados: 24 },
  { fecha: '2026-11-12', reservados: 4 },
  { fecha: '2026-11-14', reservados: 0 },
  { fecha: '2026-12-02', reservados: 9 },
]);

afterEach(cleanup);

function pintar(periodo: Periodo = periodoInicial(HOY)) {
  const onelegir = vi.fn();
  const r = render(CalendarioActividad, { periodo, actividad, hoy: HOY, onelegir });
  return { ...r, onelegir };
}

const dia = (iso: string) => document.querySelector(`[data-dia="${iso}"]`) as HTMLButtonElement;
const semana = (lunes: string) => document.querySelector(`[data-semana="${lunes}"]`) as HTMLButtonElement;
const viajeros = (iso: string) => dia(iso).querySelector('[data-viajeros]');
const numero = (iso: string) => texto(dia(iso).firstElementChild);

describe('CalendarioActividad · estructura', () => {
  it('es una cuadrícula con el mes por nombre, encabezados de columna y una fila por semana', () => {
    pintar();
    const grid = screen.getByRole('grid', { name: 'Noviembre de 2026' });
    const cabecera = within(grid).getAllByRole('columnheader').map((c) => c.getAttribute('aria-label') ?? texto(c));
    expect(cabecera).toEqual(['Semana', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']);
    expect(within(grid).getAllByRole('row')).toHaveLength(1 + 6); // encabezado + 6 semanas
    expect(within(grid).getAllByRole('gridcell')).toHaveLength(42);
    expect(within(grid).getAllByRole('rowheader')).toHaveLength(6);
  });

  it('los atajos Hoy / Esta semana / Este mes / Próximos 30 días, con el del período marcado', () => {
    pintar();
    const grupo = screen.getByRole('group', { name: 'Períodos rápidos' });
    const botones = within(grupo).getAllByRole('button');
    expect(botones.map((b) => [texto(b), b.getAttribute('aria-pressed')])).toEqual([
      ['Hoy', 'false'],
      ['Esta semana', 'false'],
      ['Este mes', 'true'],
      ['Próximos 30 días', 'false'],
    ]);
  });

  it('la leyenda explica los tres niveles y la marca de la semana', () => {
    pintar();
    const leyenda = texto(document.querySelector('[data-leyenda]'));
    for (const parte of ['Viajeros por día:', '1–9', '10–19', '20 o más', 'Hoy', 'Semana con salidas: total de viajeros']) expect(leyenda).toContain(parte);
  });
});

describe('CalendarioActividad · actividad', () => {
  it('cada día con salidas muestra sus viajeros y su nivel; los días sin salidas, nada', () => {
    pintar();
    expect([numero('2026-11-05'), texto(viajeros('2026-11-05')), viajeros('2026-11-05')!.getAttribute('data-nivel')]).toEqual(['5', '12', '2']);
    expect([texto(viajeros('2026-11-09')), viajeros('2026-11-09')!.getAttribute('data-nivel')]).toEqual(['24', '3']);
    expect([texto(viajeros('2026-11-12')), viajeros('2026-11-12')!.getAttribute('data-nivel')]).toEqual(['4', '1']);
    expect([texto(viajeros('2026-11-14')), viajeros('2026-11-14')!.getAttribute('data-nivel')]).toEqual(['0', '0']); // salida sin reservas
    expect(viajeros('2026-11-06')).toBeNull();
    expect(texto(dia('2026-11-06'))).toBe('6');
  });

  it('el nombre de cada día dice sus salidas y viajeros (no depende del color), y marca hoy', () => {
    pintar();
    expect(dia('2026-11-05').getAttribute('aria-label')).toBe('Jueves 5 de noviembre: 2 salidas, 12 viajeros');
    expect(dia('2026-11-06').getAttribute('aria-label')).toBe('Viernes 6 de noviembre: sin salidas');
    expect(dia('2026-11-11').getAttribute('aria-label')).toBe('Miércoles 11 de noviembre, hoy: sin salidas');
  });

  it('cada semana muestra el total de viajeros; la que no tiene salidas, una raya', () => {
    pintar();
    expect(texto(semana('2026-11-02').querySelector('[data-total]'))).toBe('12');
    expect(texto(semana('2026-11-09').querySelector('[data-total]'))).toBe('28');
    expect(texto(semana('2026-11-09'))).toContain('viaj.');
    expect(semana('2026-11-02').getAttribute('aria-label')).toBe('Semana del 2 al 8 de noviembre: 2 salidas, 12 viajeros');
    expect(texto(semana('2026-11-16'))).toBe('—');
    expect(semana('2026-11-16').getAttribute('aria-label')).toBe('Semana del 16 al 22 de noviembre: sin salidas');
  });

  it('los días del mes vecino que caen en la semana también se ven', () => {
    pintar();
    expect(dia('2026-12-02')).not.toBeNull();
    expect(dia('2026-12-02').getAttribute('aria-label')).toBe('Miércoles 2 de diciembre: 1 salida, 9 viajeros');
  });
});

describe('CalendarioActividad · elegir', () => {
  it('un atajo elige ese período', async () => {
    const { onelegir } = pintar();
    await fireEvent.click(screen.getByRole('button', { name: 'Esta semana' }));
    expect(onelegir).toHaveBeenCalledWith(periodoPredefinido('semana', HOY));
    await fireEvent.click(screen.getByRole('button', { name: 'Próximos 30 días' }));
    expect(onelegir).toHaveBeenLastCalledWith(periodoPredefinido('proximos30', HOY));
  });

  it('un día elige un período de un día', async () => {
    const { onelegir } = pintar();
    await fireEvent.click(dia('2026-11-05'));
    expect(onelegir).toHaveBeenCalledTimes(1);
    expect(onelegir).toHaveBeenCalledWith(periodoDeDia('2026-11-05'));
  });

  it('la semana elige de lunes a domingo', async () => {
    const { onelegir } = pintar();
    await fireEvent.click(semana('2026-11-09'));
    expect(onelegir).toHaveBeenCalledWith(periodoDeSemana('2026-11-09'));
  });

  it('un rango: se activa «Elegir un rango de días», el primer clic lo ancla y el segundo lo cierra, en cualquier orden', async () => {
    const { onelegir } = pintar();
    const modo = screen.getByRole('button', { name: 'Elegir un rango de días' });
    expect(modo.getAttribute('aria-pressed')).toBe('false');
    await fireEvent.click(modo);
    expect(modo.getAttribute('aria-pressed')).toBe('true');
    expect(texto(screen.getByRole('status'))).toBe('Elige el primer día del rango.');

    await fireEvent.click(dia('2026-11-12'));
    expect(onelegir).not.toHaveBeenCalled();
    expect(texto(screen.getByRole('status'))).toBe('Primer día: jue 12 nov. Elige el último día del rango.');
    expect(dia('2026-11-12').getAttribute('aria-pressed')).toBe('true');
    expect(dia('2026-11-11').getAttribute('aria-pressed')).toBe('false');

    await fireEvent.click(dia('2026-11-05'));
    expect(onelegir).toHaveBeenCalledTimes(1);
    expect(onelegir).toHaveBeenCalledWith(periodoDeRango('2026-11-05', '2026-11-12'));
  });

  it('el rango elegido se ve marcado, con los extremos distintos y los días de dentro seleccionados', () => {
    pintar(periodoDeRango('2026-11-05', '2026-11-07'));
    expect(['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'].map((f) => dia(f).getAttribute('aria-pressed'))).toEqual([
      'false',
      'true',
      'true',
      'true',
      'false',
    ]);
    expect(dia('2026-11-05').hasAttribute('data-extremo')).toBe(true);
    expect(dia('2026-11-06').hasAttribute('data-extremo')).toBe(false);
    expect(dia('2026-11-07').hasAttribute('data-extremo')).toBe(true);
  });

  it('una semana elegida marca su fila', () => {
    pintar(periodoDeSemana('2026-11-10'));
    expect(semana('2026-11-09').getAttribute('aria-pressed')).toBe('true');
    expect(semana('2026-11-02').getAttribute('aria-pressed')).toBe('false');
  });

  it('el estado dice el período y cuánto suma', () => {
    pintar(periodoPredefinido('semana', HOY));
    expect(texto(screen.getByRole('status'))).toBe('Esta semana · 9–15 nov 3 salidas · 28 viajeros');
  });
});

describe('CalendarioActividad · quitar filtro', () => {
  it('sin filtro activo no hace nada y lo explica', async () => {
    const { onelegir } = pintar();
    const quitar = screen.getByRole('button', { name: 'Quitar filtro' });
    expect(quitar.getAttribute('aria-disabled')).toBe('true');
    expect(quitar.getAttribute('title')).toBe('No hay un filtro de fecha activo');
    await fireEvent.click(quitar);
    expect(onelegir).not.toHaveBeenCalled();
  });

  it('con un filtro vuelve al período por defecto', async () => {
    const { onelegir } = pintar(periodoPredefinido('hoy', HOY));
    const quitar = screen.getByRole('button', { name: 'Quitar filtro' });
    expect(quitar.getAttribute('aria-disabled')).toBeNull();
    await fireEvent.click(quitar);
    expect(onelegir).toHaveBeenCalledWith(periodoInicial(HOY));
  });
});

describe('CalendarioActividad · meses', () => {
  it('arranca en el mes del período (aunque sea otro) y los botones cambian de mes', async () => {
    pintar(periodoDeDia('2027-01-14'));
    expect(screen.getByRole('grid', { name: 'Enero de 2027' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));
    expect(screen.getByRole('grid', { name: 'Diciembre de 2026' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    expect(screen.getByRole('grid', { name: 'Febrero de 2027' })).toBeTruthy();
  });

  it('cambiar de mes no elige nada ni cambia el período', async () => {
    const { onelegir } = pintar();
    await fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    expect(onelegir).not.toHaveBeenCalled();
    expect(dia('2026-12-02').getAttribute('aria-label')).toContain('1 salida, 9 viajeros');
  });
});

describe('CalendarioActividad · teclado', () => {
  it('un solo día entra con Tab: el primero del período', () => {
    pintar(periodoPredefinido('hoy', HOY));
    const tabulables = [...document.querySelectorAll<HTMLElement>('[data-dia]')].filter((d) => d.tabIndex === 0);
    expect(tabulables.map((d) => d.getAttribute('data-dia'))).toEqual(['2026-11-11']);
  });

  it('las flechas mueven el foco por días y semanas', async () => {
    pintar(periodoPredefinido('hoy', HOY));
    dia('2026-11-11').focus();
    await fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    await waitFor(() => expect(document.activeElement).toBe(dia('2026-11-12')));
    expect(dia('2026-11-12').tabIndex).toBe(0);
    expect(dia('2026-11-11').tabIndex).toBe(-1);
    await fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    await waitFor(() => expect(document.activeElement).toBe(dia('2026-11-19')));
    await fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
    await waitFor(() => expect(document.activeElement).toBe(dia('2026-11-18')));
    await fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    await waitFor(() => expect(document.activeElement).toBe(dia('2026-11-11')));
  });

  it('Inicio y Fin van al lunes y al domingo de la semana', async () => {
    pintar(periodoPredefinido('hoy', HOY));
    dia('2026-11-11').focus();
    await fireEvent.keyDown(document.activeElement!, { key: 'End' });
    await waitFor(() => expect(document.activeElement).toBe(dia('2026-11-15')));
    await fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    await waitFor(() => expect(document.activeElement).toBe(dia('2026-11-09')));
  });

  it('PageDown y PageUp cambian de mes y llevan el foco al mismo día del otro mes', async () => {
    pintar(periodoPredefinido('hoy', HOY));
    dia('2026-11-11').focus();
    await fireEvent.keyDown(document.activeElement!, { key: 'PageDown' });
    await waitFor(() => expect(screen.getByRole('grid', { name: 'Diciembre de 2026' })).toBeTruthy());
    await waitFor(() => expect(document.activeElement).toBe(dia('2026-12-11')));
    await fireEvent.keyDown(document.activeElement!, { key: 'PageUp' });
    await fireEvent.keyDown(document.activeElement!, { key: 'PageUp' });
    await waitFor(() => expect(screen.getByRole('grid', { name: 'Octubre de 2026' })).toBeTruthy());
    await waitFor(() => expect(document.activeElement).toBe(dia('2026-10-11')));
  });

  it('una flecha al borde del mes pasa al mes vecino', async () => {
    pintar(periodoDeDia('2026-11-30'));
    dia('2026-11-30').focus();
    await fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByRole('grid', { name: 'Diciembre de 2026' })).toBeTruthy());
    await waitFor(() => expect(document.activeElement).toBe(dia('2026-12-01')));
  });

  it('las flechas solo mueven el foco: no eligen nada; Tab y otras teclas siguen su camino', async () => {
    const { onelegir } = pintar(periodoPredefinido('hoy', HOY));
    dia('2026-11-11').focus();
    await fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(onelegir).not.toHaveBeenCalled();
    expect(await fireEvent.keyDown(document.activeElement!, { key: 'Tab' })).toBe(true); // true: no se canceló
    expect(await fireEvent.keyDown(document.activeElement!, { key: 'Enter' })).toBe(true);
  });
});
