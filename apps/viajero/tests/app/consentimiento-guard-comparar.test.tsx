import { screen } from 'expo-router/testing-library';

import { DiversoError, ExperienceCategory, Plan, PlanStatus } from '@/core';
import { olvidarPlanesParaComparar } from '@/features/catalog/planes-para-comparar';

import { arrancarApp, pantallaVisible } from '../support/app';
import { AuthFalso } from '../support/auth-falso';
import { CatalogoFalso } from '../support/catalogo-falso';
import { dependenciasDePrueba } from '../support/dependencias-de-prueba';

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
class Catalogo extends CatalogoFalso {
  constructor() {
    super({ detalles: { p1: plan('p1') } });
  }
  override async planDetalle(planId: string): Promise<Plan> {
    if (planId === 'nope') {
      this.detallesPedidos.push(planId);
      throw new DiversoError('PLAN_NO_EXISTE');
    }
    return super.planDetalle(planId);
  }
}

async function abrir(url: string, catalogo = new Catalogo()) {
  const auth = new AuthFalso();
  await arrancarApp(url, dependenciasDePrueba({ auth, catalogo }));
  return { auth, catalogo };
}

beforeEach(() => {
  olvidarPlanesParaComparar();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('rutas con ids (bug J) con el consentimiento al día', () => {
  for (const url of ['/comparar', '/comparar?ids=', '/comparar?ids=,,,']) {
    test(`J1: ${url} no consulta nada y avisa que no hay qué comparar`, async () => {
      const { auth, catalogo } = await abrir(url);

      expect(auth.consultas).toBe(1);
      expect(pantallaVisible('ComparatorView')).toBeOnTheScreen();
      expect(catalogo.detallesPedidos).toEqual([]);
      expect(screen.getByText('Nada para comparar')).toBeOnTheScreen();
    });
  }

  test('J1: /comparar?ids=nope,p1 con un plan inexistente muestra el error', async () => {
    await abrir('/comparar?ids=nope,p1');

    expect(screen.getByText('No pudimos cargar la comparación')).toBeOnTheScreen();
  });
});
