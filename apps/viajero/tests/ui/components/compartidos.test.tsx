import { screen } from '@testing-library/react-native';
import { Animated, StyleSheet } from 'react-native';

import {
  DiversoLogo,
  EmptyState,
  SectionLabel,
  Skeleton,
  Text,
  TituloPagina,
} from '@/ui/components';
import { Curvas, temaClaro, temaOscuro } from '@/ui/theme';

import { icono, renderConTema } from '../support/conTema';

const estilo = (el: { props: { style?: unknown } }) =>
  StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;

describe('SectionLabel', () => {
  it('en mayúsculas 11.5 w700 ls 1.2 onSurfaceVariant con 10 abajo', async () => {
    await renderConTema(<SectionLabel texto="Itinerario" />);
    const s = estilo(screen.getByText('ITINERARIO'));
    expect(s.fontSize).toBe(11.5);
    expect(s.fontWeight).toBe('700');
    expect(s.letterSpacing).toBe(1.2);
    expect(s.color).toBe(temaClaro.colorScheme.onSurfaceVariant);
    expect(estilo(screen.getByTestId('section-label')).paddingBottom).toBe(10);
  });

  it('con acción a la derecha', async () => {
    await renderConTema(<SectionLabel texto="Reseñas" accion={<Text>Ver todas</Text>} />);
    expect(screen.getByText('Ver todas')).toBeOnTheScreen();
  });
});

describe('TituloPagina', () => {
  it('28 w800 ls -1 altura 1.1 onSurface, una línea, encabezado', async () => {
    await renderConTema(<TituloPagina texto="Agencias" />, { modo: 'dark' });
    const titulo = screen.getByRole('header', { name: 'Agencias' });
    const s = estilo(titulo);
    expect(s.fontSize).toBe(28);
    expect(s.fontWeight).toBe('800');
    expect(s.letterSpacing).toBe(-1);
    expect(s.lineHeight).toBeCloseTo(30.8, 5);
    // Port de cabeceras_test: en oscuro el título se lee (onSurface del tema oscuro).
    expect(s.color).toBe(temaOscuro.colorScheme.onSurface);
    expect(titulo.props.numberOfLines).toBe(1);
    expect(titulo.props.ellipsizeMode).toBe('tail');
  });
});

describe('EmptyState', () => {
  it('ícono en círculo, título, mensaje, detalle monospace y acción', async () => {
    await renderConTema(
      <EmptyState
        icono="cloud_off_rounded"
        titulo="Sin conexión"
        mensaje="No pudimos cargar los planes."
        detalle="SocketException: x"
        accion={<Text>Reintentar</Text>}
      />,
    );
    const ic = icono('cloud_off_rounded');
    expect(ic.size).toBe(30);
    expect(ic.color).toBe(temaClaro.colorScheme.onSurfaceVariant);
    expect(estilo(screen.getByTestId('empty-state-icono')).backgroundColor).toBe(
      temaClaro.colorScheme.surfaceContainerHigh,
    );

    const titulo = estilo(screen.getByText('Sin conexión'));
    expect(titulo.fontSize).toBe(17);
    expect(titulo.fontWeight).toBe('700');
    expect(titulo.letterSpacing).toBe(-0.3);
    // El título no fija color: hereda el del texto por defecto, como en Flutter.
    expect(titulo.color).toBe('#1D1B20');

    const mensaje = estilo(screen.getByText('No pudimos cargar los planes.'));
    expect(mensaje.fontSize).toBe(13.5);
    expect(mensaje.lineHeight).toBeCloseTo(13.5 * 1.45, 5);
    expect(mensaje.textAlign).toBe('center');
    expect(mensaje.color).toBe(temaClaro.colorScheme.onSurfaceVariant);

    const detalle = estilo(screen.getByText('SocketException: x'));
    expect(detalle.fontSize).toBe(11);
    expect(detalle.lineHeight).toBeCloseTo(11 * 1.35, 5);
    expect(detalle.color).toBe('rgba(64, 73, 67, 0.75)');
    expect(String(detalle.fontFamily)).toMatch(/mono|Menlo|Courier/i);

    expect(screen.getByText('Reintentar')).toBeOnTheScreen();
  });

  it('sin detalle ni acción', async () => {
    await renderConTema(<EmptyState icono="search_off_rounded" titulo="Nada" mensaje="Probá otro filtro." />);
    expect(screen.getByText('Nada')).toBeOnTheScreen();
    expect(screen.queryByTestId('empty-state-detalle')).toBeNull();
  });
});

describe('Skeleton', () => {
  afterEach(() => jest.restoreAllMocks());

  it('caja surfaceContainerHigh 16 de alto y radio 10 por defecto, arranca en .45', async () => {
    await renderConTema(<Skeleton />);
    const s = estilo(screen.getByTestId('skeleton'));
    expect(s.backgroundColor).toBe(temaClaro.colorScheme.surfaceContainerHigh);
    expect(s.height).toBe(16);
    expect(s.borderRadius).toBe(10);
    expect(s.opacity).toBeCloseTo(0.45, 5);
  });

  it('pulso: .45 → 1 → .45 en tramos de 1100 ms easeInOut, en bucle', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    const loop = jest.spyOn(Animated, 'loop');
    await renderConTema(<Skeleton />);
    const tramos = timing.mock.calls.map(([, config]) => config);
    expect(tramos).toEqual([
      expect.objectContaining({ toValue: 1, duration: 1100, easing: Curvas.easeInOut.fn }),
      expect.objectContaining({ toValue: 0.45, duration: 1100, easing: Curvas.easeInOut.fn }),
    ]);
    expect(loop).toHaveBeenCalledTimes(1);
  });

  it('medidas propias', async () => {
    await renderConTema(<Skeleton width={120} height={22} radius={6} />);
    const s = estilo(screen.getByTestId('skeleton'));
    expect([s.width, s.height, s.borderRadius]).toEqual([120, 22, 6]);
  });
});

describe('DiversoLogo', () => {
  it('máscara del colibrí teñida, 48 por defecto, sin semántica', async () => {
    await renderConTema(<DiversoLogo />);
    const logo = screen.getByTestId('diverso-logo', { includeHiddenElements: true });
    const s = estilo(logo);
    expect(s.width).toBe(48);
    expect(s.height).toBe(48);
    expect(s.tintColor).toBe('#FFFFFF');
    expect(logo.props.accessible).toBe(false);
  });

  it('color y tamaño del llamador', async () => {
    await renderConTema(<DiversoLogo color="#1F6A4F" size={64} />);
    const s = estilo(screen.getByTestId('diverso-logo', { includeHiddenElements: true }));
    expect([s.width, s.tintColor]).toEqual([64, '#1F6A4F']);
  });
});
