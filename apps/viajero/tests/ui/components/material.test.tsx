import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import {
  Card,
  Divider,
  FilledButton,
  IconButton,
  InputChip,
  OutlinedButton,
  SegmentedButton,
  Text,
  TextButton,
  TextField,
  fieldMetrics,
} from '@/ui/components';
import { lightTheme, darkTheme } from '@/ui/theme';

import { icon, icons, renderWithTheme } from '../support/render-with-theme';

const styleOf = (el: { props: { style?: unknown } }) =>
  StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;

const cs = lightTheme.colorScheme;

/** Valores resueltos medidos con `flutter test` sobre `AppTheme.viajeroLight/Dark` (§3.7). */
describe('FilledButton', () => {
  it('píldora de 52, primary/onPrimary, texto 15 w700 ls -0.2 sin altura heredada', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<FilledButton onPress={onPress} text="Pagar" />);
    const button = screen.getByRole('button', { name: 'Pagar' });
    const s = styleOf(screen.getByTestId('filled-button'));
    expect(s.minHeight).toBe(52);
    expect(s.borderRadius).toBe(999);
    expect(s.backgroundColor).toBe(cs.primary);
    expect(s.paddingHorizontal).toBe(24);
    const t = styleOf(screen.getByText('Pagar'));
    expect(t.fontSize).toBe(15);
    expect(t.fontWeight).toBe('700');
    expect(t.letterSpacing).toBe(-0.2);
    expect(t.lineHeight).toBeUndefined();
    expect(t.color).toBe(cs.onPrimary);
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('tonal: secondaryContainer / onSecondaryContainer', async () => {
    await renderWithTheme(<FilledButton variant="tonal" onPress={() => {}} text="Reintentar" />);
    expect(styleOf(screen.getByTestId('filled-button')).backgroundColor).toBe(cs.secondaryContainer);
    expect(styleOf(screen.getByText('Reintentar')).color).toBe(cs.onSecondaryContainer);
  });

  it('sin onPress queda deshabilitado (onSurface 12 % / 38 %), como onPressed: null', async () => {
    const { rerender } = await renderWithTheme(<FilledButton onPress={null} text="Pagar" />);
    const button = screen.getByRole('button', { name: 'Pagar' });
    expect(button).toBeDisabled();
    expect(styleOf(screen.getByTestId('filled-button')).backgroundColor).toBe('rgba(23, 29, 26, 0.12)');
    expect(styleOf(screen.getByText('Pagar')).color).toBe('rgba(23, 29, 26, 0.38)');
    await rerender(<FilledButton text="Pagar" />);
    expect(screen.getByRole('button', { name: 'Pagar' })).toBeDisabled();
  });

  it('con ícono: 16 a la izquierda, ícono 18 y 8 de separación', async () => {
    await renderWithTheme(<FilledButton onPress={() => {}} icon="send_rounded" text="Publicar" />);
    const s = styleOf(screen.getByTestId('filled-button'));
    expect(s.paddingLeft).toBe(16);
    expect(s.paddingRight).toBe(24);
    expect(s.gap).toBe(8);
    expect(icon('send_rounded').size).toBe(18);
  });
});

describe('OutlinedButton y TextButton', () => {
  it('outlined: 48, borde outlineVariant 1, texto 14.5 w600 primary sin ls', async () => {
    await renderWithTheme(<OutlinedButton onPress={() => {}} text="Ver plan" />, { mode: 'dark' });
    const s = styleOf(screen.getByTestId('outlined-button'));
    expect(s.minHeight).toBe(48);
    expect(s.borderColor).toBe(darkTheme.colorScheme.outlineVariant);
    expect(s.borderWidth).toBe(1);
    const t = styleOf(screen.getByText('Ver plan'));
    expect([t.fontSize, t.fontWeight, t.letterSpacing, t.color]).toEqual([
      14.5,
      '600',
      0,
      darkTheme.colorScheme.primary,
    ]);
  });

  it('text button: 40 visible (48 táctil), padding 12, texto 14 w600 primary', async () => {
    await renderWithTheme(<TextButton onPress={() => {}} text="Cerrar sesión" />);
    const s = styleOf(screen.getByTestId('text-button'));
    expect(s.minHeight).toBe(40);
    expect(s.paddingHorizontal).toBe(12);
    const t = styleOf(screen.getByText('Cerrar sesión'));
    expect([t.fontSize, t.fontWeight, t.color]).toEqual([14, '600', cs.primary]);
    expect(screen.getByRole('button', { name: 'Cerrar sesión' }).props.hitSlop).toEqual({
      top: 4,
      bottom: 4,
    });
  });
});

describe('IconButton', () => {
  it('tooltip = etiqueta accesible; 40 visible; ícono 24 onSurfaceVariant', async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <IconButton icon="close_rounded" tooltip="Borrar búsqueda" onPress={onPress} />,
    );
    const button = screen.getByRole('button', { name: 'Borrar búsqueda' });
    const s = styleOf(screen.getByTestId('icon-button'));
    expect([s.width, s.height, s.borderRadius]).toEqual([40, 40, 20]);
    const ic = icon('close_rounded');
    expect([ic.size, ic.color]).toEqual([24, cs.onSurfaceVariant]);
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalled();
  });

  it('filled con colores propios (volver sobre foto)', async () => {
    await renderWithTheme(
      <IconButton
        variant="filled"
        icon="arrow_back_rounded"
        iconSize={20}
        backgroundColor="rgba(0, 0, 0, 0.45)"
        iconColor="#FFFFFF"
        tooltip="Volver"
        onPress={() => {}}
      />,
    );
    expect(styleOf(screen.getByTestId('icon-button')).backgroundColor).toBe('rgba(0, 0, 0, 0.45)');
    expect(icon('arrow_back_rounded').size).toBe(20);
  });

  it('outlined: borde outline; filledTonal: secondaryContainer', async () => {
    await renderWithTheme(
      <>
        <IconButton testID="o" variant="outlined" icon="remove_rounded" tooltip="Menos viajeros" onPress={() => {}} />
        <IconButton testID="t" variant="filledTonal" icon="add_rounded" tooltip="Más viajeros" onPress={() => {}} />
      </>,
    );
    expect(styleOf(screen.getByTestId('o')).borderColor).toBe(cs.outline);
    expect(styleOf(screen.getByTestId('t')).backgroundColor).toBe(cs.secondaryContainer);
  });
});

describe('TextField', () => {
  it('relleno negro 4 %, radio 14, alto 56 con etiqueta; texto bodyLarge; etiqueta que flota al enfocar', async () => {
    const onChangeText = jest.fn();
    await renderWithTheme(
      <TextField label="Correo" icon="mail_outline_rounded" value="" onChangeText={onChangeText} />,
    );
    const box = styleOf(screen.getByTestId('text-field'));
    expect(box.backgroundColor).toBe('rgba(0, 0, 0, 0.04)');
    expect(box.borderRadius).toBe(14);
    expect(box.minHeight).toBe(56);
    const input = screen.getByLabelText('Correo');
    const ti = styleOf(input);
    expect([ti.fontSize, ti.letterSpacing, ti.color]).toEqual([16, 0.5, '#1D1B20']);
    expect(icon('mail_outline_rounded').color).toBe(cs.onSurfaceVariant);

    await fireEvent(input, 'focus');
    expect(styleOf(screen.getByTestId('text-field')).borderColor).toBe(cs.primary);
    expect(styleOf(screen.getByTestId('text-field')).borderWidth).toBe(1.6);
    await fireEvent.changeText(input, 'ana@correo.test');
    expect(onChangeText).toHaveBeenCalledWith('ana@correo.test');
  });

  it('error: borde error 1.2 y texto de error bodySmall', async () => {
    await renderWithTheme(<TextField label="Correo" value="x" error="Correo inválido" onChangeText={() => {}} />);
    const box = styleOf(screen.getByTestId('text-field'));
    expect(box.borderColor).toBe(cs.error);
    expect(box.borderWidth).toBe(1.2);
    const e = styleOf(screen.getByText('Correo inválido'));
    expect([e.fontSize, e.letterSpacing, e.color]).toEqual([12, 0.4, cs.error]);
  });

  it('pista (hint) sin etiqueta: caja de 52', async () => {
    await renderWithTheme(<TextField hint="Buscar destino…" value="" onChangeText={() => {}} />);
    expect(screen.getByPlaceholderText('Buscar destino…')).toBeOnTheScreen();
    expect(styleOf(screen.getByTestId('text-field')).minHeight).toBe(52);
  });
});

describe('InputChip', () => {
  it('píldora transparente con borde 1 px outlineVariant (input chip de M3), etiqueta 13 w600 onSurface y botón de borrar', async () => {
    const onDelete = jest.fn();
    await renderWithTheme(
      <InputChip icon="location_on_outlined" label="Guatapé" onDelete={onDelete} deleteLabel="Quitar destino" />,
    );
    const chip = styleOf(screen.getByTestId('input-chip'));
    expect(chip.backgroundColor).toBe('transparent');
    // Sin borde se leía como texto suelto junto a los demás filtros.
    expect([chip.borderWidth, chip.borderColor]).toEqual([1, cs.outlineVariant]);
    expect(chip.borderRadius).toBe(999);
    expect(chip.height).toBe(32);
    const t = styleOf(screen.getByText('Guatapé'));
    expect([t.fontSize, t.fontWeight, t.color]).toEqual([13, '600', cs.onSurface]);
    expect(icon('location_on_outlined').color).toBe(cs.onSurfaceVariant);
    await fireEvent.press(screen.getByRole('button', { name: 'Quitar destino' }));
    expect(onDelete).toHaveBeenCalled();
  });
});

describe('Card, Divider y SegmentedButton', () => {
  it('card: surfaceContainerLow, radio 20, sin elevación', async () => {
    await renderWithTheme(
      <Card>
        <Text>hola</Text>
      </Card>,
    );
    const s = styleOf(screen.getByTestId('card'));
    expect([s.backgroundColor, s.borderRadius]).toEqual([cs.surfaceContainerLow, 20]);
  });

  it('divider: 1 px outlineVariant 50 %', async () => {
    await renderWithTheme(<Divider />);
    const s = styleOf(screen.getByTestId('divider'));
    expect([s.height, s.backgroundColor]).toEqual([1, 'rgba(191, 201, 194, 0.5)']);
  });

  it('segmented: el seleccionado en secondaryContainer con check; texto 13.5 w600', async () => {
    const onChange = jest.fn();
    await renderWithTheme(
      <SegmentedButton
        segments={[
          { value: 'system', label: 'Sistema' },
          { value: 'light', label: 'Claro' },
          { value: 'dark', label: 'Oscuro' },
        ]}
        selected="system"
        onChange={onChange}
      />,
    );
    const systemButton = screen.getByRole('button', { name: 'Sistema' });
    expect(systemButton).toBeSelected();
    expect(styleOf(systemButton).backgroundColor).toBe(cs.secondaryContainer);
    expect(icons('check_rounded')).toHaveLength(1);
    const t = styleOf(screen.getByText('Claro'));
    expect([t.fontSize, t.fontWeight, t.color]).toEqual([13.5, '600', cs.onSurface]);
    await fireEvent.press(screen.getByRole('button', { name: 'Oscuro' }));
    expect(onChange).toHaveBeenCalledWith('dark');
  });

  it('segmented sin ícono de seleccionado (`showSelectedIcon: false`): sin ✓', async () => {
    await renderWithTheme(
      <SegmentedButton
        segments={[
          { value: 'a', label: 'Puntaje' },
          { value: 'b', label: 'Nombre' },
        ]}
        selected="a"
        onChange={() => {}}
        showSelectedIcon={false}
      />,
    );
    expect(screen.getByRole('button', { name: 'Puntaje' })).toBeSelected();
    expect(icons('check_rounded')).toHaveLength(0);
  });
});

describe('TextField con sufijo', () => {
  test('el sufijo (p. ej. un IconButton de 48) ocupa todo el alto de la caja sin agrandarla, como el suffixIcon de Flutter', async () => {
    await renderWithTheme(
      <TextField value="" onChangeText={() => {}} label="Contraseña" suffix={<IconButton icon="clear" tooltip="Borrar" onPress={() => {}} />} />,
    );
    const suffix = StyleSheet.flatten(screen.getByTestId('suffix').props.style);
    // Con etiqueta la caja es 24 arriba + 24 de línea + 8 abajo: los márgenes negativos lo estiran a 56.
    expect([suffix.marginTop, suffix.marginBottom]).toEqual([-24, -8]);
  });
});

describe('TextField: etiqueta con ícono', () => {
  test('flotando, la etiqueta se alinea con el texto (no se monta sobre el ícono)', async () => {
    await renderWithTheme(<TextField label="Correo" icon="mail_outline_rounded" value="ana@correo.test" onChangeText={() => {}} />);
    // Ícono: 48 de ancho + 4 de aire → el texto y la etiqueta empiezan en 52.
    expect(StyleSheet.flatten(screen.getByTestId('floating-label', { includeHiddenElements: true }).props.style).left).toBe(52);
  });

  test('sin ícono, la etiqueta empieza donde el texto (20)', async () => {
    await renderWithTheme(<TextField label="Tu nombre" value="Ana" onChangeText={() => {}} />);
    expect(StyleSheet.flatten(screen.getByTestId('floating-label', { includeHiddenElements: true }).props.style).left).toBe(20);
  });
});

describe('fieldMetrics (M3 filled)', () => {
  test('con etiqueta: 56 de alto y la etiqueta flotante DENTRO de la caja, sin pisar el texto ni el borde', () => {
    for (const borderWidth of [0, 1.2, 1.6, 2]) {
      const m = fieldMetrics({ hasLabel: true, lines: 1, borderWidth });
      expect(m.boxHeight).toBe(56);
      // Flotando: 12 px de alto desde floatingTop; el borde ocupa [0, borderWidth] y el texto empieza en `top`.
      expect(m.floatingTop).toBeGreaterThanOrEqual(borderWidth);
      expect(m.floatingTop + 12).toBeLessThanOrEqual(m.top);
      expect(m.restingTop).toBe((56 - 16) / 2);
    }
  });

  test('sin etiqueta: 14 arriba y abajo, 52 de alto', () => {
    expect(fieldMetrics({ hasLabel: false, lines: 1, borderWidth: 0 })).toMatchObject({ top: 14, bottom: 14, boxHeight: 52 });
  });

  test('multilínea con etiqueta: la etiqueta en reposo arranca en la primera línea', () => {
    const m = fieldMetrics({ hasLabel: true, lines: 5, borderWidth: 0 });
    expect(m.boxHeight).toBe(24 + 24 * 5 + 8);
    expect(m.restingTop).toBe(m.top + 4);
  });
});

describe('TextField: tocar la caja enfoca el campo', () => {
  test('tocar cualquier parte del contenedor (p. ej. la franja de la etiqueta) enfoca el texto, como en M3', async () => {
    // En Jest, TextInput es un mock cuyo focus() es el jest.fn compartido de MockNativeMethods.
    const { focus } = jest.requireActual('@react-native/jest-preset/jest/MockNativeMethods').default as { focus: jest.Mock };
    focus.mockClear();
    await renderWithTheme(<TextField label="Contraseña" value="" onChangeText={() => {}} />);
    await fireEvent.press(screen.getByTestId('text-field'));
    expect(focus).toHaveBeenCalledTimes(1);
  });
});
