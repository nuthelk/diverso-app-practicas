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
  titulo: 'Plan número 1',
  destino: 'Guatapé',
  categoria: ExperienceCategory.aventura,
  precioCop: 150000,
  estado: PlanStatus.publicado,
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
});
