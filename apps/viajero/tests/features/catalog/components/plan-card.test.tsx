import { fireEvent, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ExperienceCategory, Plan, PlanStatus } from '@/core';
import { PlanCard } from '@/features/catalog/components/PlanCard';

import { reiniciarRouterFalso, routerFalso } from '../../../support/expo-router-falso';
import { renderPantalla } from '../../../support/pantalla';

jest.mock('expo-router', () => require('../../../support/expo-router-falso'));

const plan = new Plan({
  id: 'plan-1',
  agencyId: 'ag-1',
  title: 'Plan número 1',
  destination: 'Guatapé',
  category: ExperienceCategory.adventure,
  priceCop: 150000,
  status: PlanStatus.published,
});

beforeEach(reiniciarRouterFalso);

describe('PlanCard', () => {
  test('el botón de comparar NO está dentro del botón de la tarjeta (en web sería <button> en <button>)', async () => {
    const toggle = jest.fn();
    await renderPantalla(<PlanCard plan={plan} onToggleComparar={toggle} />);

    const tarjeta = screen.getByTestId('plan-card-plan-1');
    expect(within(tarjeta).queryByRole('button', { name: 'Agregar al comparador' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Agregar al comparador' }));
    expect(toggle).toHaveBeenCalledWith(plan);
    expect(routerFalso.push).not.toHaveBeenCalled();
  });

  test('la tarjeta crece para llenar la celda de la grilla, como en SliverGrid', async () => {
    await renderPantalla(<PlanCard plan={plan} />);
    expect(StyleSheet.flatten(screen.getByTestId('plan-card-plan-1').props.style).flexGrow).toBe(1);
  });

  test('la píldora de duración es oscura translúcida con texto blanco: se lee sobre fotos claras', async () => {
    await renderPantalla(<PlanCard plan={plan} />);
    const pildora = screen.getByTestId('pildora-duracion');
    const fondo = String(StyleSheet.flatten(pildora.props.style).backgroundColor);
    const m = fondo.match(/rgba\((\d+), ?(\d+), ?(\d+), ?([\d.]+)\)/);
    expect(m).not.toBeNull();
    const [r, g, b, a] = m!.slice(1).map(Number) as [number, number, number, number];
    // Negro (no blanco) y con cuerpo suficiente para que el blanco contraste sobre un cielo.
    expect(r + g + b).toBe(0);
    expect(a).toBeGreaterThanOrEqual(0.35);
    expect(a).toBeLessThan(0.6);
    const texto = within(pildora).getByText(plan.durationText);
    expect(StyleSheet.flatten(texto.props.style).color).toBe('#FFFFFF');
  });
});
