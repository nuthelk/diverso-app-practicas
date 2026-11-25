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
  medidasCampo,
} from '@/ui/components';
import { temaClaro, temaOscuro } from '@/ui/theme';

import { icono, iconos, renderConTema } from '../support/conTema';

const estilo = (el: { props: { style?: unknown } }) =>
  StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;

const cs = temaClaro.colorScheme;

/** Valores resueltos medidos con `flutter test` sobre `AppTheme.viajeroLight/Dark` (§3.7). */
describe('FilledButton', () => {
  it('píldora de 52, primary/onPrimary, texto 15 w700 ls -0.2 sin altura heredada', async () => {
    const onPress = jest.fn();
    await renderConTema(<FilledButton onPress={onPress} texto="Pagar" />);
    const boton = screen.getByRole('button', { name: 'Pagar' });
    const s = estilo(screen.getByTestId('filled-button'));
    expect(s.minHeight).toBe(52);
    expect(s.borderRadius).toBe(999);
    expect(s.backgroundColor).toBe(cs.primary);
    expect(s.paddingHorizontal).toBe(24);
    const t = estilo(screen.getByText('Pagar'));
    expect(t.fontSize).toBe(15);
    expect(t.fontWeight).toBe('700');
    expect(t.letterSpacing).toBe(-0.2);
    expect(t.lineHeight).toBeUndefined();
    expect(t.color).toBe(cs.onPrimary);
    await fireEvent.press(boton);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('tonal: secondaryContainer / onSecondaryContainer', async () => {
    await renderConTema(<FilledButton variante="tonal" onPress={() => {}} texto="Reintentar" />);
    expect(estilo(screen.getByTestId('filled-button')).backgroundColor).toBe(cs.secondaryContainer);
    expect(estilo(screen.getByText('Reintentar')).color).toBe(cs.onSecondaryContainer);
  });

  it('sin onPress queda deshabilitado (onSurface 12 % / 38 %), como onPressed: null', async () => {
    const { rerender } = await renderConTema(<FilledButton onPress={null} texto="Pagar" />);
    const boton = screen.getByRole('button', { name: 'Pagar' });
    expect(boton).toBeDisabled();
    expect(estilo(screen.getByTestId('filled-button')).backgroundColor).toBe('rgba(23, 29, 26, 0.12)');
    expect(estilo(screen.getByText('Pagar')).color).toBe('rgba(23, 29, 26, 0.38)');
    await rerender(<FilledButton texto="Pagar" />);
    expect(screen.getByRole('button', { name: 'Pagar' })).toBeDisabled();
  });

  it('con ícono: 16 a la izquierda, ícono 18 y 8 de separación', async () => {
    await renderConTema(<FilledButton onPress={() => {}} icono="send_rounded" texto="Publicar" />);
    const s = estilo(screen.getByTestId('filled-button'));
    expect(s.paddingLeft).toBe(16);
    expect(s.paddingRight).toBe(24);
    expect(s.gap).toBe(8);
    expect(icono('send_rounded').size).toBe(18);
  });
});

describe('OutlinedButton y TextButton', () => {
  it('outlined: 48, borde outlineVariant 1, texto 14.5 w600 primary sin ls', async () => {
    await renderConTema(<OutlinedButton onPress={() => {}} texto="Ver plan" />, { modo: 'dark' });
    const s = estilo(screen.getByTestId('outlined-button'));
    expect(s.minHeight).toBe(48);
    expect(s.borderColor).toBe(temaOscuro.colorScheme.outlineVariant);
    expect(s.borderWidth).toBe(1);
    const t = estilo(screen.getByText('Ver plan'));
    expect([t.fontSize, t.fontWeight, t.letterSpacing, t.color]).toEqual([
      14.5,
      '600',
      0,
      temaOscuro.colorScheme.primary,
    ]);
  });

  it('text button: 40 visible (48 táctil), padding 12, texto 14 w600 primary', async () => {
    await renderConTema(<TextButton onPress={() => {}} texto="Cerrar sesión" />);
    const s = estilo(screen.getByTestId('text-button'));
    expect(s.minHeight).toBe(40);
    expect(s.paddingHorizontal).toBe(12);
    const t = estilo(screen.getByText('Cerrar sesión'));
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
    await renderConTema(
      <IconButton icono="close_rounded" tooltip="Borrar búsqueda" onPress={onPress} />,
    );
    const boton = screen.getByRole('button', { name: 'Borrar búsqueda' });
    const s = estilo(screen.getByTestId('icon-button'));
    expect([s.width, s.height, s.borderRadius]).toEqual([40, 40, 20]);
    const ic = icono('close_rounded');
    expect([ic.size, ic.color]).toEqual([24, cs.onSurfaceVariant]);
    await fireEvent.press(boton);
    expect(onPress).toHaveBeenCalled();
  });

  it('filled con colores propios (volver sobre foto)', async () => {
    await renderConTema(
      <IconButton
        variante="filled"
        icono="arrow_back_rounded"
        tamanoIcono={20}
        colorFondo="rgba(0, 0, 0, 0.45)"
        colorIcono="#FFFFFF"
        tooltip="Volver"
        onPress={() => {}}
      />,
    );
    expect(estilo(screen.getByTestId('icon-button')).backgroundColor).toBe('rgba(0, 0, 0, 0.45)');
    expect(icono('arrow_back_rounded').size).toBe(20);
  });

  it('outlined: borde outline; filledTonal: secondaryContainer', async () => {
    await renderConTema(
      <>
        <IconButton testID="o" variante="outlined" icono="remove_rounded" tooltip="Menos viajeros" onPress={() => {}} />
        <IconButton testID="t" variante="filledTonal" icono="add_rounded" tooltip="Más viajeros" onPress={() => {}} />
      </>,
    );
    expect(estilo(screen.getByTestId('o')).borderColor).toBe(cs.outline);
    expect(estilo(screen.getByTestId('t')).backgroundColor).toBe(cs.secondaryContainer);
  });
});

describe('TextField', () => {
  it('relleno negro 4 %, radio 14, alto 56 con etiqueta; texto bodyLarge; etiqueta que flota al enfocar', async () => {
    const onChangeText = jest.fn();
    await renderConTema(
      <TextField etiqueta="Correo" icono="mail_outline_rounded" valor="" onChangeText={onChangeText} />,
    );
    const caja = estilo(screen.getByTestId('text-field'));
    expect(caja.backgroundColor).toBe('rgba(0, 0, 0, 0.04)');
    expect(caja.borderRadius).toBe(14);
    expect(caja.minHeight).toBe(56);
    const input = screen.getByLabelText('Correo');
    const ti = estilo(input);
    expect([ti.fontSize, ti.letterSpacing, ti.color]).toEqual([16, 0.5, '#1D1B20']);
    expect(icono('mail_outline_rounded').color).toBe(cs.onSurfaceVariant);

    await fireEvent(input, 'focus');
    expect(estilo(screen.getByTestId('text-field')).borderColor).toBe(cs.primary);
    expect(estilo(screen.getByTestId('text-field')).borderWidth).toBe(1.6);
    await fireEvent.changeText(input, 'ana@correo.test');
    expect(onChangeText).toHaveBeenCalledWith('ana@correo.test');
  });

  it('error: borde error 1.2 y texto de error bodySmall', async () => {
    await renderConTema(<TextField etiqueta="Correo" valor="x" error="Correo inválido" onChangeText={() => {}} />);
    const caja = estilo(screen.getByTestId('text-field'));
    expect(caja.borderColor).toBe(cs.error);
    expect(caja.borderWidth).toBe(1.2);
    const e = estilo(screen.getByText('Correo inválido'));
    expect([e.fontSize, e.letterSpacing, e.color]).toEqual([12, 0.4, cs.error]);
  });

  it('pista (hint) sin etiqueta: caja de 52', async () => {
    await renderConTema(<TextField pista="Buscar destino…" valor="" onChangeText={() => {}} />);
    expect(screen.getByPlaceholderText('Buscar destino…')).toBeOnTheScreen();
    expect(estilo(screen.getByTestId('text-field')).minHeight).toBe(52);
  });
});

describe('InputChip', () => {
  it('píldora transparente con borde 1 px outlineVariant (input chip de M3), etiqueta 13 w600 onSurface y botón de borrar', async () => {
    const onBorrar = jest.fn();
    await renderConTema(
      <InputChip icono="location_on_outlined" etiqueta="Guatapé" onBorrar={onBorrar} etiquetaBorrar="Quitar destino" />,
    );
    const chip = estilo(screen.getByTestId('input-chip'));
    expect(chip.backgroundColor).toBe('transparent');
    // Sin borde se leía como texto suelto junto a los demás filtros.
    expect([chip.borderWidth, chip.borderColor]).toEqual([1, cs.outlineVariant]);
    expect(chip.borderRadius).toBe(999);
    expect(chip.height).toBe(32);
    const t = estilo(screen.getByText('Guatapé'));
    expect([t.fontSize, t.fontWeight, t.color]).toEqual([13, '600', cs.onSurface]);
    expect(icono('location_on_outlined').color).toBe(cs.onSurfaceVariant);
    await fireEvent.press(screen.getByRole('button', { name: 'Quitar destino' }));
    expect(onBorrar).toHaveBeenCalled();
  });
});

describe('Card, Divider y SegmentedButton', () => {
  it('card: surfaceContainerLow, radio 20, sin elevación', async () => {
    await renderConTema(
      <Card>
        <Text>hola</Text>
      </Card>,
    );
    const s = estilo(screen.getByTestId('card'));
    expect([s.backgroundColor, s.borderRadius]).toEqual([cs.surfaceContainerLow, 20]);
  });

  it('divider: 1 px outlineVariant 50 %', async () => {
    await renderConTema(<Divider />);
    const s = estilo(screen.getByTestId('divider'));
    expect([s.height, s.backgroundColor]).toEqual([1, 'rgba(191, 201, 194, 0.5)']);
  });

  it('segmented: el seleccionado en secondaryContainer con check; texto 13.5 w600', async () => {
    const onCambio = jest.fn();
    await renderConTema(
      <SegmentedButton
        segmentos={[
          { valor: 'system', etiqueta: 'Sistema' },
          { valor: 'light', etiqueta: 'Claro' },
          { valor: 'dark', etiqueta: 'Oscuro' },
        ]}
        seleccionado="system"
        onCambio={onCambio}
      />,
    );
    const sistema = screen.getByRole('button', { name: 'Sistema' });
    expect(sistema).toBeSelected();
    expect(estilo(sistema).backgroundColor).toBe(cs.secondaryContainer);
    expect(iconos('check_rounded')).toHaveLength(1);
    const t = estilo(screen.getByText('Claro'));
    expect([t.fontSize, t.fontWeight, t.color]).toEqual([13.5, '600', cs.onSurface]);
    await fireEvent.press(screen.getByRole('button', { name: 'Oscuro' }));
    expect(onCambio).toHaveBeenCalledWith('dark');
  });

  it('segmented sin ícono de seleccionado (`showSelectedIcon: false`): sin ✓', async () => {
    await renderConTema(
      <SegmentedButton
        segmentos={[
          { valor: 'a', etiqueta: 'Puntaje' },
          { valor: 'b', etiqueta: 'Nombre' },
        ]}
        seleccionado="a"
        onCambio={() => {}}
        mostrarIconoSeleccionado={false}
      />,
    );
    expect(screen.getByRole('button', { name: 'Puntaje' })).toBeSelected();
    expect(iconos('check_rounded')).toHaveLength(0);
  });
});

describe('TextField con sufijo', () => {
  test('el sufijo (p. ej. un IconButton de 48) ocupa todo el alto de la caja sin agrandarla, como el suffixIcon de Flutter', async () => {
    await renderConTema(
      <TextField valor="" onChangeText={() => {}} etiqueta="Contraseña" sufijo={<IconButton icono="clear" tooltip="Borrar" onPress={() => {}} />} />,
    );
    const sufijo = StyleSheet.flatten(screen.getByTestId('sufijo').props.style);
    // Con etiqueta la caja es 24 arriba + 24 de línea + 8 abajo: los márgenes negativos lo estiran a 56.
    expect([sufijo.marginTop, sufijo.marginBottom]).toEqual([-24, -8]);
  });
});

describe('TextField: etiqueta con ícono', () => {
  test('flotando, la etiqueta se alinea con el texto (no se monta sobre el ícono)', async () => {
    await renderConTema(<TextField etiqueta="Correo" icono="mail_outline_rounded" valor="ana@correo.test" onChangeText={() => {}} />);
    // Ícono: 48 de ancho + 4 de aire → el texto y la etiqueta empiezan en 52.
    expect(StyleSheet.flatten(screen.getByTestId('etiqueta-flotante', { includeHiddenElements: true }).props.style).left).toBe(52);
  });

  test('sin ícono, la etiqueta empieza donde el texto (20)', async () => {
    await renderConTema(<TextField etiqueta="Tu nombre" valor="Ana" onChangeText={() => {}} />);
    expect(StyleSheet.flatten(screen.getByTestId('etiqueta-flotante', { includeHiddenElements: true }).props.style).left).toBe(20);
  });
});

describe('medidasCampo (M3 filled)', () => {
  test('con etiqueta: 56 de alto y la etiqueta flotante DENTRO de la caja, sin pisar el texto ni el borde', () => {
    for (const anchoBorde of [0, 1.2, 1.6, 2]) {
      const m = medidasCampo({ conEtiqueta: true, lineas: 1, anchoBorde });
      expect(m.altoCaja).toBe(56);
      // Flotando: 12 px de alto desde topFlotando; el borde ocupa [0, anchoBorde] y el texto empieza en `arriba`.
      expect(m.topFlotando).toBeGreaterThanOrEqual(anchoBorde);
      expect(m.topFlotando + 12).toBeLessThanOrEqual(m.arriba);
      expect(m.topReposo).toBe((56 - 16) / 2);
    }
  });

  test('sin etiqueta: 14 arriba y abajo, 52 de alto', () => {
    expect(medidasCampo({ conEtiqueta: false, lineas: 1, anchoBorde: 0 })).toMatchObject({ arriba: 14, abajo: 14, altoCaja: 52 });
  });

  test('multilínea con etiqueta: la etiqueta en reposo arranca en la primera línea', () => {
    const m = medidasCampo({ conEtiqueta: true, lineas: 5, anchoBorde: 0 });
    expect(m.altoCaja).toBe(24 + 24 * 5 + 8);
    expect(m.topReposo).toBe(m.arriba + 4);
  });
});
