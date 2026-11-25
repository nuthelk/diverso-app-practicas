import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { AgencyAvatar, colorDeAgencia, hashFnv1a } from '@/ui/components';

import { renderWithTheme } from '../support/render-with-theme';

const estilo = (el: { props: { style?: unknown } }) =>
  StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;

/**
 * Valores de referencia calculados ejecutando `colorDeAgencia` de Dart (agency_avatar.dart) con
 * `flutter test`: si el hash cambia, cada agencia cambia de color.
 */
describe('colorDeAgencia (FNV-1a 32 bits sobre UTF-16, idéntico al Dart)', () => {
  it.each([
    ['ag-rutas', 3189731663, '#4F4A8A'],
    ['a', 3826002220, '#1F6F7A'],
    ['', 2166136261, '#8A4B14'],
    ['agencia-1', 294086951, '#4F4A8A'],
    ['ñandú', 1308677765, '#8A4B14'],
    ['7f3c1a2e-0b6d-4e8a-9c1f-2d3e4f5a6b7c', 2513267176, '#0E6E4F'],
  ])('«%s» → h=%i → %s', (clave, h, color) => {
    expect(hashFnv1a(clave)).toBe(h);
    expect(colorDeAgencia(clave)).toBe(color);
  });

  it('estable: la misma clave da siempre el mismo color', () => {
    expect(colorDeAgencia('ag-rutas')).toBe(colorDeAgencia('ag-rutas'));
  });
});

describe('AgencyAvatar', () => {
  const agencia = { id: 'ag-rutas', initials: 'RA', logoUrl: null };

  it('sin logo: iniciales blancas w800 sobre el color de la agencia', async () => {
    await renderWithTheme(<AgencyAvatar agencia={agencia} />);
    const iniciales = screen.getByText('RA');
    const s = estilo(iniciales);
    expect(s.color).toBe('#FFFFFF');
    expect(s.fontWeight).toBe('800');
    expect(s.fontSize).toBeCloseTo(46 * 0.38, 5);
    expect(s.letterSpacing).toBe(0.5);
    const circulo = estilo(screen.getByTestId('agency-avatar'));
    expect(circulo.width).toBe(46);
    expect(circulo.height).toBe(46);
    expect(circulo.borderRadius).toBe(23);
    expect(estilo(screen.getByTestId('agency-avatar-iniciales')).backgroundColor).toBe('#4F4A8A');
  });

  it('logo vacío cuenta como sin logo', async () => {
    await renderWithTheme(<AgencyAvatar agencia={{ ...agencia, logoUrl: '' }} size={60} />);
    expect(screen.getByText('RA')).toBeOnTheScreen();
    expect(screen.queryByTestId('agency-avatar-logo')).toBeNull();
  });

  it('con logo muestra la imagen y, si falla, las iniciales', async () => {
    await renderWithTheme(
      <AgencyAvatar agencia={{ ...agencia, logoUrl: 'https://x.test/logo.png' }} />,
    );
    const logo = screen.getByTestId('agency-avatar-logo');
    expect(screen.queryByText('RA')).toBeNull();

    await fireEvent(logo, 'error', { nativeEvent: { error: 'HTTP 404' } });
    expect(screen.getByText('RA')).toBeOnTheScreen();
    expect(screen.queryByTestId('agency-avatar-logo')).toBeNull();
  });
});
