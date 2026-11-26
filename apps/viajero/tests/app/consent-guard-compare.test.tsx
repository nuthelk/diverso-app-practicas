import { screen } from 'expo-router/testing-library';

import { DiversoError, ExperienceCategory, Plan, PlanStatus } from '@/core';
import { forgetPlansToCompare } from '@/features/catalog/plans-to-compare';

import { startApp, visibleScreen } from '../support/app';
import { FakeAuth } from '../support/fake-auth';
import { FakeCatalogRepository } from '../support/fake-catalog-repository';
import { testDependencies } from '../support/test-dependencies';

/**
 * Rutas con ids (bug J) con el consentimiento al día: `/comparar` sin ids no consulta nada y avisa
 * que no hay qué comparar; con un id inexistente muestra el error en vez de quedar en blanco. Port
 * de los casos J1 de `router/consentimiento_guard_test.dart` (los de la reseña, J2, van aparte).
 */

const plan = (id: string) =>
  new Plan({
    id,
    agencyId: 'ag-1',
    title: `Plan ${id}`,
    destination: 'Guatapé',
    category: ExperienceCategory.adventure,
    priceCop: 150000,
    status: PlanStatus.published,
  });

/** Como el `_Catalogo` de Flutter: `nope` no existe (el servidor responde «no existe»). */
class CatalogWithMissingPlan extends FakeCatalogRepository {
  constructor() {
    super({ details: { p1: plan('p1') } });
  }
  override async planDetail(planId: string): Promise<Plan> {
    if (planId === 'nope') {
      this.requestedPlanIds.push(planId);
      throw new DiversoError('PLAN_NO_EXISTE');
    }
    return super.planDetail(planId);
  }
}

async function openApp(url: string, catalog = new CatalogWithMissingPlan()) {
  const auth = new FakeAuth();
  await startApp(url, testDependencies({ auth, catalog }));
  return { auth, catalog };
}

beforeEach(() => {
  forgetPlansToCompare();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('rutas con ids (bug J) con el consentimiento al día', () => {
  for (const url of ['/comparar', '/comparar?ids=', '/comparar?ids=,,,']) {
    test(`J1: ${url} no consulta nada y avisa que no hay qué comparar`, async () => {
      const { auth, catalog } = await openApp(url);

      expect(auth.consentQueries).toBe(1);
      expect(visibleScreen('ComparatorView')).toBeOnTheScreen();
      expect(catalog.requestedPlanIds).toEqual([]);
      expect(screen.getByText('Nada para comparar')).toBeOnTheScreen();
    });
  }

  test('J1: /comparar?ids=nope,p1 con un plan inexistente muestra el error', async () => {
    await openApp('/comparar?ids=nope,p1');

    expect(screen.getByText('No pudimos cargar la comparación')).toBeOnTheScreen();
  });
});
