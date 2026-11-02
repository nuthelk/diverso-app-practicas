import type { Component } from 'svelte';
import { segmentos } from '@/shared/lib/router.svelte';
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

/** 'sola' = la página se dibuja sin marco; 'panel' = dentro del Shell. */
export type Layout = 'sola' | 'panel';

type Params = Record<string, string | undefined>;

interface Ruta {
  /** Segmentos literales, `:param` (obligatorio) o `:param?` (opcional). Los segmentos de más se ignoran. */
  patron: string;
  componente: Component<any>;
  layout: Layout;
  /** Cómo pasan los parámetros a props; sin esto, los parámetros se pasan tal cual. */
  props?: (params: Params) => Record<string, unknown>;
}

export interface RutaResuelta {
  /** El patrón que coincidió: cambiar de ruta vuelve a montar la página aunque el componente sea el mismo. */
  patron: string | null;
  /** null = ruta no encontrada: App dibuja el aviso dentro del Shell. */
  componente: Component<any> | null;
  props: Record<string, unknown>;
  layout: Layout;
}

/** En orden: gana la primera que coincide (las más específicas van antes). */
const RUTAS: Ruta[] = [
  { patron: '/legal/:doc?', componente: Legal, layout: 'sola', props: (p) => ({ doc: p.doc ?? '' }) },
  { patron: '/login', componente: Login, layout: 'sola' },
  { patron: '/consentimiento', componente: AceptarDocumentos, layout: 'sola' },
  { patron: '/starter', componente: Starter, layout: 'sola' },
  { patron: '/admin/dispersiones', componente: AdminDispersiones, layout: 'sola' },
  { patron: '/admin', componente: Admin, layout: 'sola' },
  { patron: '/onboarding', componente: Onboarding, layout: 'panel' },
  { patron: '/dashboard', componente: Dashboard, layout: 'panel' },
  { patron: '/planes/nuevo', componente: PlanForm, layout: 'panel', props: () => ({}) },
  { patron: '/planes/editar/:planId?', componente: PlanForm, layout: 'panel' },
  { patron: '/planes', componente: Planes, layout: 'panel' },
  { patron: '/ventas', componente: Ventas, layout: 'panel' },
  { patron: '/liquidaciones/:id', componente: LiquidacionDetalle, layout: 'panel' },
  { patron: '/liquidaciones', componente: Liquidaciones, layout: 'panel' },
  { patron: '/cuenta-dispersiones', componente: CuentaDispersion, layout: 'panel' },
];

const NO_ENCONTRADA: RutaResuelta = { patron: null, componente: null, props: {}, layout: 'panel' };

/** Parámetros de la ruta si el patrón coincide con los segmentos (prefijo), o null. */
function coincide(patron: string, segs: string[]): Params | null {
  const params: Params = {};
  const partes = segmentos(patron);
  for (const [i, parte] of partes.entries()) {
    if (!parte.startsWith(':')) {
      if (segs[i] !== parte) return null;
      continue;
    }
    const opcional = parte.endsWith('?');
    if (segs[i] === undefined && !opcional) return null;
    params[parte.slice(1, opcional ? -1 : undefined)] = segs[i];
  }
  return params;
}

/** Qué página dibujar para un path. Pura: no toca el router ni la sesión. */
export function resolverRuta(path: string): RutaResuelta {
  const segs = segmentos(path);
  for (const ruta of RUTAS) {
    const params = coincide(ruta.patron, segs);
    if (params) {
      return {
        patron: ruta.patron,
        componente: ruta.componente,
        props: ruta.props ? ruta.props(params) : params,
        layout: ruta.layout,
      };
    }
  }
  return NO_ENCONTRADA;
}
