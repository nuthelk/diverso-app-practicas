import { describe, expect, it } from 'vitest';

// Cada página del árbol, la página de $lib que dibuja; las de (panel) van dentro del Shell.
const fuentes = import.meta.glob('./**/+page.svelte', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

const ESPERADO: Record<string, string | null> = {
  './+page.svelte': null,
  './login/+page.svelte': 'auth/LoginPage.svelte',
  './starter/+page.svelte': 'auth/StarterPage.svelte',
  './consentimiento/+page.svelte': 'legal/AceptarDocumentosPage.svelte',
  './legal/[[doc=doc]]/+page.svelte': 'legal/LegalPage.svelte',
  './admin/+page.svelte': 'admin/AdminAgenciasPage.svelte',
  './admin/dispersiones/+page.svelte': 'admin/AdminDispersionesPage.svelte',
  './(panel)/onboarding/+page.svelte': 'agencias/OnboardingPage.svelte',
  './(panel)/dashboard/+page.svelte': 'resumen/ResumenPage.svelte',
  './(panel)/planes/+page.svelte': 'planes/PlanesPage.svelte',
  './(panel)/planes/nuevo/+page.svelte': 'planes/PlanFormPage.svelte',
  './(panel)/planes/editar/[[id]]/+page.svelte': 'planes/PlanFormPage.svelte',
  './(panel)/ventas/+page.svelte': 'ventas/VentasPage.svelte',
  './(panel)/liquidaciones/+page.svelte': 'liquidaciones/LiquidacionesPage.svelte',
  './(panel)/liquidaciones/[id]/+page.svelte': 'liquidaciones/LiquidacionDetallePage.svelte',
  './(panel)/cuenta-dispersiones/+page.svelte': 'liquidaciones/CuentaDispersionPage.svelte',
};

describe('árbol de rutas', () => {
  it('tiene exactamente las rutas de antes de SvelteKit, más / → /starter', () => {
    expect(Object.keys(fuentes).sort()).toEqual(Object.keys(ESPERADO).sort());
  });

  it.each(Object.entries(ESPERADO).filter(([, pagina]) => pagina))('%s dibuja %s', (ruta, pagina) => {
    expect(fuentes[ruta]).toContain(`$lib/features/${pagina}'`);
  });

  it('editar pasa el id como planId y el detalle como id', () => {
    expect(fuentes['./(panel)/planes/editar/[[id]]/+page.svelte']).toContain('planId={params.id}');
    expect(fuentes['./(panel)/liquidaciones/[id]/+page.svelte']).toContain('id={params.id}');
  });
});
