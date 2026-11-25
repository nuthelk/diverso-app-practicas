import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { EstrellasCalificacion, InsigniaNueva, RatingStars } from '@/ui/components';
import { temaClaro } from '@/ui/theme';

import { icono, iconos, renderConTema } from '../support/conTema';

const estilo = (el: { props: { style?: unknown } }) =>
  StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;

// Port de widget_test.dart y estrellas_resena_test.dart.
describe('RatingStars', () => {
  it('muestra la estrella y el valor', async () => {
    await renderConTema(<RatingStars calificacion={4.2} mostrarNumero />);
    expect(iconos('star_rounded')).toHaveLength(1);
    expect(screen.getByText('4.2')).toBeOnTheScreen();
  });

  it('estrella dorada de size+2 y número de size-1 en w700 onSurface', async () => {
    await renderConTema(<RatingStars calificacion={4} mostrarNumero size={15} />);
    const ic = icono('star_rounded');
    expect(ic.size).toBe(17);
    expect(ic.color).toBe('#E8A33D');
    const s = estilo(screen.getByText('4.0'));
    expect(s.fontSize).toBe(14);
    expect(s.fontWeight).toBe('700');
    expect(s.color).toBe(temaClaro.colorScheme.onSurface);
  });

  it('sin número solo la estrella', async () => {
    await renderConTema(<RatingStars calificacion={4.2} />);
    expect(screen.queryByText('4.2')).toBeNull();
  });
});

describe('EstrellasCalificacion', () => {
  it.each([
    [5, 5],
    [4, 4],
    [2, 2],
    [1, 1],
  ])('%i★: %i llenas y el resto vacías, con «N de 5 estrellas»', async (calificacion, llenas) => {
    await renderConTema(<EstrellasCalificacion calificacion={calificacion} />);
    expect(iconos('star_rounded')).toHaveLength(llenas);
    expect(iconos('star_outline_rounded')).toHaveLength(5 - llenas);
    expect(screen.getByLabelText(`${calificacion} de 5 estrellas`)).toBeOnTheScreen();
  });

  it('vacías en outlineVariant, llenas en dorado', async () => {
    await renderConTema(<EstrellasCalificacion calificacion={3} />);
    expect(iconos('star_rounded')[0].color).toBe('#E8A33D');
    expect(iconos('star_outline_rounded')[0].color).toBe(
      temaClaro.colorScheme.outlineVariant,
    );
  });

  it('PRESERVE: el resumen del plan sigue siendo una estrella con el número', async () => {
    await renderConTema(<RatingStars calificacion={4.2} mostrarNumero />);
    expect(iconos('star_rounded')).toHaveLength(1);
    expect(screen.getByText('4.2')).toBeOnTheScreen();
  });
});

describe('InsigniaNueva', () => {
  it('dice «Nueva» en primary sobre primary al 10 %', async () => {
    await renderConTema(<InsigniaNueva />);
    const texto = screen.getByText('Nueva');
    const s = estilo(texto);
    expect(s.color).toBe(temaClaro.colorScheme.primary);
    expect(s.fontSize).toBe(11.5);
    expect(s.fontWeight).toBe('700');
    const caja = estilo(screen.getByTestId('insignia-nueva'));
    expect(caja.backgroundColor).toBe('rgba(31, 106, 79, 0.1)');
    expect(caja.paddingHorizontal).toBe(8);
    expect(caja.paddingVertical).toBe(2);
  });

  it('texto configurable', async () => {
    await renderConTema(<InsigniaNueva texto="Nuevo" />);
    expect(screen.getByText('Nuevo')).toBeOnTheScreen();
  });
});
