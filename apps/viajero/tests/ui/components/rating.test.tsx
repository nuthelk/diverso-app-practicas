import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ReviewStars, NewBadge, RatingStars } from '@/ui/components';
import { lightTheme } from '@/ui/theme';

import { icon, icons, renderWithTheme } from '../support/render-with-theme';

const styleOf = (el: { props: { style?: unknown } }) =>
  StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;

// Port de widget_test.dart y estrellas_resena_test.dart.
describe('RatingStars', () => {
  it('muestra la estrella y el valor', async () => {
    await renderWithTheme(<RatingStars rating={4.2} showNumber />);
    expect(icons('star_rounded')).toHaveLength(1);
    expect(screen.getByText('4.2')).toBeOnTheScreen();
  });

  it('estrella dorada de size+2 y número de size-1 en w700 onSurface', async () => {
    await renderWithTheme(<RatingStars rating={4} showNumber size={15} />);
    const ic = icon('star_rounded');
    expect(ic.size).toBe(17);
    expect(ic.color).toBe('#E8A33D');
    const s = styleOf(screen.getByText('4.0'));
    expect(s.fontSize).toBe(14);
    expect(s.fontWeight).toBe('700');
    expect(s.color).toBe(lightTheme.colorScheme.onSurface);
  });

  it('sin número solo la estrella', async () => {
    await renderWithTheme(<RatingStars rating={4.2} />);
    expect(screen.queryByText('4.2')).toBeNull();
  });
});

describe('ReviewStars', () => {
  it.each([
    [5, 5],
    [4, 4],
    [2, 2],
    [1, 1],
  ])('%i★: %i llenas y el resto vacías, con «N de 5 estrellas»', async (rating, filled) => {
    await renderWithTheme(<ReviewStars rating={rating} />);
    expect(icons('star_rounded')).toHaveLength(filled);
    expect(icons('star_outline_rounded')).toHaveLength(5 - filled);
    expect(screen.getByLabelText(`${rating} de 5 estrellas`)).toBeOnTheScreen();
  });

  it('vacías en outlineVariant, llenas en dorado', async () => {
    await renderWithTheme(<ReviewStars rating={3} />);
    expect(icons('star_rounded')[0].color).toBe('#E8A33D');
    expect(icons('star_outline_rounded')[0].color).toBe(
      lightTheme.colorScheme.outlineVariant,
    );
  });

  it('PRESERVE: el resumen del plan sigue siendo una estrella con el número', async () => {
    await renderWithTheme(<RatingStars rating={4.2} showNumber />);
    expect(icons('star_rounded')).toHaveLength(1);
    expect(screen.getByText('4.2')).toBeOnTheScreen();
  });
});

describe('NewBadge', () => {
  it('dice «Nueva» en primary sobre primary al 10 %', async () => {
    await renderWithTheme(<NewBadge />);
    const text = screen.getByText('Nueva');
    const s = styleOf(text);
    expect(s.color).toBe(lightTheme.colorScheme.primary);
    expect(s.fontSize).toBe(11.5);
    expect(s.fontWeight).toBe('700');
    const box = styleOf(screen.getByTestId('new-badge'));
    expect(box.backgroundColor).toBe('rgba(31, 106, 79, 0.1)');
    expect(box.paddingHorizontal).toBe(8);
    expect(box.paddingVertical).toBe(2);
  });

  it('texto configurable', async () => {
    await renderWithTheme(<NewBadge text="Nuevo" />);
    expect(screen.getByText('Nuevo')).toBeOnTheScreen();
  });
});
