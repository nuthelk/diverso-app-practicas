import {
  Curvas,
  Duraciones,
  TransicionesDePagina,
  opcionesDePantalla,
} from '@/ui/theme';

/** `DiversoPageTransitions` (diverso_core/lib/ui/page_transitions.dart) y §3.9. */
describe('transiciones de página', () => {
  it('sharedAxisX: 380 ms (vuelta 300), entra desde +8 % con fundido; la cubierta se va a -5 %', () => {
    const t = TransicionesDePagina.sharedAxisX;
    expect(t.duracion).toBe(380);
    expect(t.duracionVuelta).toBe(300);

    const inicio = t.entrada(0);
    expect(inicio.opacity).toBeCloseTo(0, 5);
    expect(inicio.translateXFraccion).toBeCloseTo(0.08, 5);
    const fin = t.entrada(1);
    expect(fin.opacity).toBeCloseTo(1, 5);
    expect(fin.translateXFraccion).toBeCloseTo(0, 5);
    // easeOutCubic: a mitad de camino ya va muy avanzada.
    expect(t.entrada(0.5).opacity).toBeGreaterThan(0.8);

    const cubierta = t.salida(1);
    expect(cubierta.opacity).toBeCloseTo(0, 5);
    expect(cubierta.translateXFraccion).toBeCloseTo(-0.05, 5);
  });

  it('fadeThrough: 320 ms; la entrante espera hasta 35 % y escala desde 0.94; la saliente se apaga en el primer 40 %', () => {
    const t = TransicionesDePagina.fadeThrough;
    expect(t.duracion).toBe(320);
    expect(t.duracionVuelta).toBe(320);
    expect(t.entrada(0.3).opacity).toBe(0);
    expect(t.entrada(0.3).scale).toBeCloseTo(0.94, 5);
    expect(t.entrada(1).opacity).toBeCloseTo(1, 5);
    expect(t.entrada(1).scale).toBeCloseTo(1, 5);
    expect(t.salida(0.4).opacity).toBeCloseTo(0, 5);
    expect(t.salida(0.2).opacity).toBeGreaterThan(0);
  });

  it('zoomIn: 440 ms; crece desde 0.90 con rebote (easeOutBack se pasa de 1)', () => {
    const t = TransicionesDePagina.zoomIn;
    expect(t.duracion).toBe(440);
    expect(t.entrada(0).scale).toBeCloseTo(0.9, 5);
    expect(t.entrada(0).opacity).toBeCloseTo(0, 5);
    expect(t.entrada(1).scale).toBeCloseTo(1, 5);
    const picos = [0.6, 0.7, 0.8].map((p) => t.entrada(p).scale);
    expect(Math.max(...picos)).toBeGreaterThan(1);
  });

  it('opciones para Expo Router (native-stack)', () => {
    expect(opcionesDePantalla.sharedAxisX).toEqual({
      animation: 'slide_from_right',
      animationDuration: 380,
    });
    expect(opcionesDePantalla.fadeThrough).toEqual({ animation: 'fade', animationDuration: 320 });
    expect(opcionesDePantalla.zoomIn).toEqual({ animation: 'fade', animationDuration: 440 });
  });
});

describe('curvas y duraciones', () => {
  it('curvas de Flutter como cubic-bezier', () => {
    expect(Curvas.easeOutCubic.puntos).toEqual([0.215, 0.61, 0.355, 1.0]);
    expect(Curvas.easeInCubic.puntos).toEqual([0.55, 0.055, 0.675, 0.19]);
    expect(Curvas.easeInOut.puntos).toEqual([0.42, 0.0, 0.58, 1.0]);
    expect(Curvas.easeOut.puntos).toEqual([0.0, 0.0, 0.58, 1.0]);
    expect(Curvas.easeIn.puntos).toEqual([0.42, 0.0, 1.0, 1.0]);
    expect(Curvas.easeOutBack.puntos).toEqual([0.175, 0.885, 0.32, 1.275]);
    expect(Curvas.fastOutSlowIn.puntos).toEqual([0.4, 0.0, 0.2, 1.0]);
    expect(Curvas.easeOutCubic.fn(0)).toBeCloseTo(0, 5);
    expect(Curvas.easeOutCubic.fn(1)).toBeCloseTo(1, 5);
  });

  it('elasticOut (período 0.4) termina en 1 y se pasa en el camino', () => {
    expect(Curvas.elasticOut(0)).toBeCloseTo(0, 5);
    expect(Curvas.elasticOut(1)).toBeCloseTo(1, 2);
    expect(Curvas.elasticOut(0.2)).toBeGreaterThan(1);
  });

  it('duraciones de §3.9', () => {
    expect(Duraciones).toEqual({
      skeleton: 1100,
      chipCategoria: 180,
      chipFecha: 160,
      bandejaComparar: 220,
      etiquetaEstrellas: 150,
      galeria: 900,
      checkConfirmacion: 380,
      aparecer: 640,
      campoTexto: 167,
    });
  });
});
