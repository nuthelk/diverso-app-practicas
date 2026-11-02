import { describe, expect, it } from 'vitest';
import { resolverRuta as resolverConPatron } from './rutas';
import Login from '@/features/auth/LoginPage.svelte';
import Starter from '@/features/auth/StarterPage.svelte';
import Onboarding from '@/features/agencias/OnboardingPage.svelte';
import Dashboard from '@/features/resumen/ResumenPage.svelte';
import Planes from '@/features/planes/PlanesPage.svelte';
import PlanForm from '@/features/planes/PlanFormPage.svelte';
import Ventas from '@/features/ventas/VentasPage.svelte';
import Admin from '@/features/admin/AdminAgenciasPage.svelte';
import AdminDispersiones from '@/features/admin/AdminDispersionesPage.svelte';
import Liquidaciones from '@/features/liquidaciones/LiquidacionesPage.svelte';
import LiquidacionDetalle from '@/features/liquidaciones/LiquidacionDetallePage.svelte';
import CuentaDispersion from '@/features/liquidaciones/CuentaDispersionPage.svelte';
import Legal from '@/features/legal/LegalPage.svelte';
import AceptarDocumentos from '@/features/legal/AceptarDocumentosPage.svelte';

/** Qué página, con qué props y en qué layout; el patrón se prueba aparte. */
function resolverRuta(path: string) {
  const { patron: _patron, ...pagina } = resolverConPatron(path);
  return pagina;
}

describe('resolverRuta', () => {
  describe('páginas solas (sin Shell)', () => {
    it.each([
      ['/login', Login, {}],
      ['/starter', Starter, {}],
      ['/consentimiento', AceptarDocumentos, {}],
      ['/admin', Admin, {}],
      ['/admin/dispersiones', AdminDispersiones, {}],
    ])('%s', (path, componente, props) => {
      expect(resolverRuta(path)).toEqual({ componente, props, layout: 'sola' });
    });

    it('/legal/<doc> pasa el documento', () => {
      expect(resolverRuta('/legal/terminos')).toEqual({
        componente: Legal,
        props: { doc: 'terminos' },
        layout: 'sola',
      });
    });

    it('/legal sin documento pasa doc vacío', () => {
      expect(resolverRuta('/legal')).toEqual({ componente: Legal, props: { doc: '' }, layout: 'sola' });
    });
  });

  describe('páginas dentro del Shell', () => {
    it.each([
      ['/onboarding', Onboarding, {}],
      ['/dashboard', Dashboard, {}],
      ['/planes', Planes, {}],
      ['/planes/nuevo', PlanForm, {}],
      ['/ventas', Ventas, {}],
      ['/liquidaciones', Liquidaciones, {}],
      ['/cuenta-dispersiones', CuentaDispersion, {}],
    ])('%s', (path, componente, props) => {
      expect(resolverRuta(path)).toEqual({ componente, props, layout: 'panel' });
    });

    it('/planes/editar/<id> pasa planId', () => {
      expect(resolverRuta('/planes/editar/p-1')).toEqual({
        componente: PlanForm,
        props: { planId: 'p-1' },
        layout: 'panel',
      });
    });

    it('/planes/editar sin id deja planId sin definir', () => {
      const ruta = resolverRuta('/planes/editar');
      expect(ruta.componente).toBe(PlanForm);
      expect(ruta.layout).toBe('panel');
      expect(ruta.props.planId).toBeUndefined();
    });

    it('/liquidaciones/<id> abre el detalle', () => {
      expect(resolverRuta('/liquidaciones/l-9')).toEqual({
        componente: LiquidacionDetalle,
        props: { id: 'l-9' },
        layout: 'panel',
      });
    });
  });

  describe('prefijo: los segmentos de más se ignoran', () => {
    it.each([
      ['/admin/x', Admin, {}],
      ['/admin/dispersiones/x/y', AdminDispersiones, {}],
      ['/ventas/x', Ventas, {}],
      ['/planes/x', Planes, {}],
      ['/planes/nuevo/x', PlanForm, {}],
      ['/dashboard/a/b', Dashboard, {}],
      ['/login/x', Login, {}],
      ['/legal/terminos/x', Legal, { doc: 'terminos' }],
      ['/planes/editar/p-1/x', PlanForm, { planId: 'p-1' }],
      ['/liquidaciones/l-9/x', LiquidacionDetalle, { id: 'l-9' }],
    ])('%s', (path, componente, props) => {
      expect(resolverRuta(path)).toMatchObject({ componente, props });
    });
  });

  describe('normalización de barras', () => {
    it('ignora barras finales y repetidas', () => {
      expect(resolverRuta('/liquidaciones/')).toMatchObject({ componente: Liquidaciones });
      expect(resolverRuta('//ventas//')).toMatchObject({ componente: Ventas });
      expect(resolverRuta('/planes/editar/p-1/')).toMatchObject({ props: { planId: 'p-1' } });
    });
  });

  describe('no encontrada (dentro del Shell)', () => {
    it.each(['/', '', '/nada', '/Dashboard', '/planesx', '/loginx', '/cuenta'])('%s', (path) => {
      expect(resolverRuta(path)).toEqual({ componente: null, props: {}, layout: 'panel' });
    });
  });
});

describe('cada ruta monta su propia instancia de la página', () => {
  it('nuevo y editar usan PlanForm con patrones distintos (App los separa con {#key})', () => {
    expect(resolverConPatron('/planes/nuevo').patron).toBe('/planes/nuevo');
    expect(resolverConPatron('/planes/editar/p-1').patron).toBe('/planes/editar/:planId?');
  });

  it('dentro de la misma ruta el patrón no cambia: solo cambian las props', () => {
    expect(resolverConPatron('/planes/editar/a').patron).toBe(resolverConPatron('/planes/editar/b').patron);
  });

  it('una ruta no encontrada no tiene patrón', () => {
    expect(resolverConPatron('/nada').patron).toBeNull();
  });
});
