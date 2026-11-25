import {
  Curves,
  Durations,
  PageTransitions,
  screenOptions,
} from '@/ui/theme';

/** `DiversoPageTransitions` (diverso_core/lib/ui/page_transitions.dart) y §3.9. */
describe('transiciones de página', () => {
  it('sharedAxisX: 380 ms (vuelta 300), entra desde +8 % con fundido; la cubierta se va a -5 %', () => {
    const t = PageTransitions.sharedAxisX;
    expect(t.duration).toBe(380);
    expect(t.reverseDuration).toBe(300);

    const start = t.enter(0);
    expect(start.opacity).toBeCloseTo(0, 5);
    expect(start.translateXFraction).toBeCloseTo(0.08, 5);
    const end = t.enter(1);
    expect(end.opacity).toBeCloseTo(1, 5);
    expect(end.translateXFraction).toBeCloseTo(0, 5);
    // easeOutCubic: a mitad de camino ya va muy avanzada.
    expect(t.enter(0.5).opacity).toBeGreaterThan(0.8);

    const covered = t.exit(1);
    expect(covered.opacity).toBeCloseTo(0, 5);
    expect(covered.translateXFraction).toBeCloseTo(-0.05, 5);
  });

  it('fadeThrough: 320 ms; la entrante espera hasta 35 % y escala desde 0.94; la saliente se apaga en el primer 40 %', () => {
    const t = PageTransitions.fadeThrough;
    expect(t.duration).toBe(320);
    expect(t.reverseDuration).toBe(320);
    expect(t.enter(0.3).opacity).toBe(0);
    expect(t.enter(0.3).scale).toBeCloseTo(0.94, 5);
    expect(t.enter(1).opacity).toBeCloseTo(1, 5);
    expect(t.enter(1).scale).toBeCloseTo(1, 5);
    expect(t.exit(0.4).opacity).toBeCloseTo(0, 5);
    expect(t.exit(0.2).opacity).toBeGreaterThan(0);
  });

  it('zoomIn: 440 ms; crece desde 0.90 con rebote (easeOutBack se pasa de 1)', () => {
    const t = PageTransitions.zoomIn;
    expect(t.duration).toBe(440);
    expect(t.enter(0).scale).toBeCloseTo(0.9, 5);
    expect(t.enter(0).opacity).toBeCloseTo(0, 5);
    expect(t.enter(1).scale).toBeCloseTo(1, 5);
    const peaks = [0.6, 0.7, 0.8].map((p) => t.enter(p).scale);
    expect(Math.max(...peaks)).toBeGreaterThan(1);
  });

  it('opciones para Expo Router (native-stack)', () => {
    expect(screenOptions.sharedAxisX).toEqual({
      animation: 'slide_from_right',
      animationDuration: 380,
    });
    expect(screenOptions.fadeThrough).toEqual({ animation: 'fade', animationDuration: 320 });
    expect(screenOptions.zoomIn).toEqual({ animation: 'fade', animationDuration: 440 });
  });
});

describe('curvas y duraciones', () => {
  it('curvas de Flutter como cubic-bezier', () => {
    expect(Curves.easeOutCubic.points).toEqual([0.215, 0.61, 0.355, 1.0]);
    expect(Curves.easeInCubic.points).toEqual([0.55, 0.055, 0.675, 0.19]);
    expect(Curves.easeInOut.points).toEqual([0.42, 0.0, 0.58, 1.0]);
    expect(Curves.easeOut.points).toEqual([0.0, 0.0, 0.58, 1.0]);
    expect(Curves.easeIn.points).toEqual([0.42, 0.0, 1.0, 1.0]);
    expect(Curves.easeOutBack.points).toEqual([0.175, 0.885, 0.32, 1.275]);
    expect(Curves.fastOutSlowIn.points).toEqual([0.4, 0.0, 0.2, 1.0]);
    expect(Curves.easeOutCubic.fn(0)).toBeCloseTo(0, 5);
    expect(Curves.easeOutCubic.fn(1)).toBeCloseTo(1, 5);
  });

  it('elasticOut (período 0.4) termina en 1 y se pasa en el camino', () => {
    expect(Curves.elasticOut(0)).toBeCloseTo(0, 5);
    expect(Curves.elasticOut(1)).toBeCloseTo(1, 2);
    expect(Curves.elasticOut(0.2)).toBeGreaterThan(1);
  });

  it('duraciones de §3.9', () => {
    expect(Durations).toEqual({
      skeleton: 1100,
      categoryChip: 180,
      dateChip: 160,
      compareTray: 220,
      starsLabel: 150,
      gallery: 900,
      confirmationCheck: 380,
      appear: 640,
      textField: 167,
    });
  });
});
