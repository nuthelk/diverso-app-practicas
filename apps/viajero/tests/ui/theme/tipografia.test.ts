import { familiaRoboto, resolverEstiloTexto, textTheme } from '@/ui/theme';

/** Escala M3 2021 tal como la resuelve `Theme.of(context).textTheme` en la app Flutter (§3.4). */
describe('textTheme', () => {
  it('cada estilo con tamaño, peso, altura y letter-spacing literales', () => {
    expect(textTheme).toEqual({
      displayLarge: { fontSize: 57, fontWeight: '400', altura: 1.12, letterSpacing: -0.25 },
      displayMedium: { fontSize: 45, fontWeight: '400', altura: 1.16, letterSpacing: 0 },
      displaySmall: { fontSize: 36, fontWeight: '400', altura: 1.22, letterSpacing: 0 },
      headlineLarge: { fontSize: 32, fontWeight: '400', altura: 1.25, letterSpacing: 0 },
      headlineMedium: { fontSize: 28, fontWeight: '400', altura: 1.29, letterSpacing: 0 },
      headlineSmall: { fontSize: 24, fontWeight: '400', altura: 1.33, letterSpacing: 0 },
      titleLarge: { fontSize: 22, fontWeight: '400', altura: 1.27, letterSpacing: 0 },
      titleMedium: { fontSize: 16, fontWeight: '500', altura: 1.5, letterSpacing: 0.15 },
      titleSmall: { fontSize: 14, fontWeight: '500', altura: 1.43, letterSpacing: 0.1 },
      bodyLarge: { fontSize: 16, fontWeight: '400', altura: 1.5, letterSpacing: 0.5 },
      bodyMedium: { fontSize: 14, fontWeight: '400', altura: 1.43, letterSpacing: 0.25 },
      bodySmall: { fontSize: 12, fontWeight: '400', altura: 1.33, letterSpacing: 0.4 },
      labelLarge: { fontSize: 14, fontWeight: '500', altura: 1.43, letterSpacing: 0.1 },
      labelMedium: { fontSize: 12, fontWeight: '500', altura: 1.33, letterSpacing: 0.5 },
      labelSmall: { fontSize: 11, fontWeight: '500', altura: 1.45, letterSpacing: 0.5 },
    });
  });
});

describe('Roboto por peso (Android y web)', () => {
  it('cada peso usa su archivo de Roboto', () => {
    expect(familiaRoboto('400')).toBe('Roboto_400Regular');
    expect(familiaRoboto('500')).toBe('Roboto_500Medium');
    expect(familiaRoboto('600')).toBe('Roboto_600SemiBold');
    expect(familiaRoboto('700')).toBe('Roboto_700Bold');
    expect(familiaRoboto('800')).toBe('Roboto_800ExtraBold');
    expect(familiaRoboto('bold')).toBe('Roboto_700Bold');
    expect(familiaRoboto('normal')).toBe('Roboto_400Regular');
  });
});

/**
 * Lo que hereda TODO texto en Flutter (`DefaultTextStyle` = bodyMedium + color del textTheme):
 * altura y letter-spacing se heredan aunque el sitio cambie el tamaño.
 */
describe('resolverEstiloTexto', () => {
  const base = { ...textTheme.bodyMedium, color: '#1D1B20' };

  it('texto sin estilo: Roboto 14, lineHeight 14×1.43, letterSpacing 0.25, color por defecto', () => {
    const r = resolverEstiloTexto({ base, plataforma: 'android' });
    expect(r.fontSize).toBe(14);
    expect(r.lineHeight).toBeCloseTo(20.02, 5);
    expect(r.letterSpacing).toBe(0.25);
    expect(r.color).toBe('#1D1B20');
    expect(r.fontFamily).toBe('Roboto_400Regular');
  });

  it('un tamaño propio hereda altura 1.43 y letterSpacing 0.25 (como Flutter)', () => {
    const r = resolverEstiloTexto({
      base,
      estilo: { fontSize: 13, fontWeight: '700' },
      plataforma: 'android',
    });
    expect(r.lineHeight).toBeCloseTo(13 * 1.43, 5);
    expect(r.letterSpacing).toBe(0.25);
    expect(r.fontFamily).toBe('Roboto_700Bold');
    // En Android el peso lo da el archivo: un fontWeight encima sintetiza negritas.
    expect(r.fontWeight).toBeUndefined();
  });

  it('la variante trae su propia altura y letter-spacing', () => {
    const r = resolverEstiloTexto({ base, variante: 'titleMedium', plataforma: 'web' });
    expect(r.fontSize).toBe(16);
    expect(r.lineHeight).toBeCloseTo(24, 5);
    expect(r.letterSpacing).toBe(0.15);
    expect(r.fontFamily).toBe('Roboto_500Medium');
  });

  it('altura explícita (TextStyle.height) y altura natural (null)', () => {
    const conAltura = resolverEstiloTexto({
      base,
      estilo: { fontSize: 28 },
      altura: 1.1,
      plataforma: 'android',
    });
    expect(conAltura.lineHeight).toBeCloseTo(30.8, 5);
    const natural = resolverEstiloTexto({ base, altura: null, plataforma: 'android' });
    expect(natural.lineHeight).toBeUndefined();
  });

  it('un lineHeight explícito gana', () => {
    const r = resolverEstiloTexto({ base, estilo: { lineHeight: 18 }, plataforma: 'android' });
    expect(r.lineHeight).toBe(18);
  });

  it('iOS usa la fuente del sistema con fontWeight (como Flutter)', () => {
    const r = resolverEstiloTexto({ base, estilo: { fontWeight: '800' }, plataforma: 'ios' });
    expect(r.fontFamily).toBeUndefined();
    expect(r.fontWeight).toBe('800');
  });

  it('una familia explícita (monospace) se respeta', () => {
    const r = resolverEstiloTexto({
      base,
      estilo: { fontFamily: 'monospace' },
      plataforma: 'android',
    });
    expect(r.fontFamily).toBe('monospace');
  });
});
