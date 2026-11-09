import { describe, expect, it } from 'vitest';

// Cada página del árbol, la página de $lib que dibuja; las de (panel) van dentro del Shell.
const crudas = import.meta.glob('/src/routes/**/+page.svelte', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;
// Las claves vuelven a ser relativas a src/routes, como las de ESPERADO.
const fuentes = Object.fromEntries(Object.entries(crudas).map(([ruta, fuente]) => ['.' + ruta.slice('/src/routes'.length), fuente]));

const ESPERADO: Record<string, string | null> = {
  './+page.svelte': null,
  './login/+page.svelte': 'auth/pages/LoginPage.svelte',
  './starter/+page.svelte': 'auth/pages/StarterPage.svelte',
  './consentimiento/+page.svelte': 'legal/pages/AceptarDocumentosPage.svelte',
  './legal/[[doc=doc]]/+page.svelte': 'legal/pages/LegalPage.svelte',
  './admin/+page.svelte': 'admin/pages/AdminAgenciasPage.svelte',
  './admin/dispersiones/+page.svelte': 'admin/pages/AdminDispersionesPage.svelte',
  './(panel)/onboarding/+page.svelte': 'agencias/pages/OnboardingPage.svelte',
  './(panel)/perfil/+page.svelte': 'agencias/pages/PerfilAgenciaPage.svelte',
  './(panel)/resenas/+page.svelte': 'resenas/pages/ResenasPage.svelte',
  './(panel)/dashboard/+page.svelte': 'resumen/pages/ResumenPage.svelte',
  './(panel)/planes/+page.svelte': 'planes/pages/PlanesPage.svelte',
  './(panel)/planes/nuevo/+page.svelte': 'planes/pages/PlanFormPage.svelte',
  './(panel)/planes/editar/[[id]]/+page.svelte': 'planes/pages/PlanFormPage.svelte',
  './(panel)/ventas/+page.svelte': 'ventas/pages/VentasPage.svelte',
  './(panel)/liquidaciones/+page.svelte': 'liquidaciones/pages/LiquidacionesPage.svelte',
  './(panel)/liquidaciones/[id]/+page.svelte': 'liquidaciones/pages/LiquidacionDetallePage.svelte',
  './(panel)/cuenta-dispersiones/+page.svelte': 'liquidaciones/pages/CuentaDispersionPage.svelte',
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
