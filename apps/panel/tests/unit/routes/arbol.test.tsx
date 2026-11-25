import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RouteObject } from 'react-router';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { act, cleanup, render, screen } from '@testing-library/react';
import { propsDe } from '@tests/pagina-espia';

// Cada página se reemplaza por un espía que muestra sus props; así se ve qué página dibuja cada URL y con qué datos.
vi.mock('@/features/auth/pages/LoginPage', async () => (await import('@tests/pagina-espia')).paginaEspia('auth/pages/LoginPage'));
vi.mock('@/features/auth/pages/StarterPage', async () => (await import('@tests/pagina-espia')).paginaEspia('auth/pages/StarterPage'));
vi.mock('@/features/legal/pages/AceptarDocumentosPage', async () => (await import('@tests/pagina-espia')).paginaEspia('legal/pages/AceptarDocumentosPage'));
vi.mock('@/features/legal/pages/LegalPage', async () => (await import('@tests/pagina-espia')).paginaEspia('legal/pages/LegalPage'));
vi.mock('@/features/admin/pages/AdminAgenciasPage', async () => (await import('@tests/pagina-espia')).paginaEspia('admin/pages/AdminAgenciasPage'));
vi.mock('@/features/admin/pages/AdminDispersionesPage', async () => (await import('@tests/pagina-espia')).paginaEspia('admin/pages/AdminDispersionesPage'));
vi.mock('@/features/agencias/pages/OnboardingPage', async () => (await import('@tests/pagina-espia')).paginaEspia('agencias/pages/OnboardingPage'));
vi.mock('@/features/agencias/pages/PerfilAgenciaPage', async () => (await import('@tests/pagina-espia')).paginaEspia('agencias/pages/PerfilAgenciaPage'));
vi.mock('@/features/resenas/pages/ResenasPage', async () => (await import('@tests/pagina-espia')).paginaEspia('resenas/pages/ResenasPage'));
vi.mock('@/features/resumen/pages/ResumenPage', async () => (await import('@tests/pagina-espia')).paginaEspia('resumen/pages/ResumenPage'));
vi.mock('@/features/planes/pages/PlanesPage', async () => (await import('@tests/pagina-espia')).paginaEspia('planes/pages/PlanesPage'));
vi.mock('@/features/planes/pages/PlanFormPage', async () => (await import('@tests/pagina-espia')).paginaEspia('planes/pages/PlanFormPage'));
vi.mock('@/features/ventas/pages/VentasPage', async () => (await import('@tests/pagina-espia')).paginaEspia('ventas/pages/VentasPage'));
vi.mock('@/features/liquidaciones/pages/LiquidacionesPage', async () => (await import('@tests/pagina-espia')).paginaEspia('liquidaciones/pages/LiquidacionesPage'));
vi.mock('@/features/liquidaciones/pages/LiquidacionDetallePage', async () => (await import('@tests/pagina-espia')).paginaEspia('liquidaciones/pages/LiquidacionDetallePage'));
vi.mock('@/features/liquidaciones/pages/CuentaDispersionPage', async () => (await import('@tests/pagina-espia')).paginaEspia('liquidaciones/pages/CuentaDispersionPage'));
vi.mock('@/features/agencias/components/Shell', async () => (await import('@tests/pagina-espia')).paginaEspia('agencias/components/Shell'));
// Con sesión lista y sin usuario; el guard se apaga aquí (se prueba en RaizLayout.test): solo interesa qué dibuja cada URL.
vi.mock('@/features/auth/model/auth', async () => (await import('@tests/auth-falso')).authFalso());
vi.mock('@/features/auth/model/sesion', () => ({ redireccionSesion: () => null }));

import { rutas } from '@/app/router';
import PanelLayout from '@/app/layouts/PanelLayout';

afterEach(cleanup);

/** Todas las rutas del árbol con su patrón completo, y si van dentro del Shell (el grupo `(panel)` de SvelteKit). */
function aplanar(lista: RouteObject[], base = '', enPanel = false): { ruta: string; enPanel: boolean }[] {
  return lista.flatMap((r) => {
    const ruta = r.index ? base || '/' : r.path ? `${base}/${r.path}` : base;
    const panel = enPanel || (r.element as { type?: unknown } | undefined)?.type === PanelLayout;
    const propias = r.index || r.path ? [{ ruta, enPanel: panel }] : [];
    return [...propias, ...aplanar(r.children ?? [], ruta, panel)];
  });
}

const PANEL = 'agencias/components/Shell';

/** Dibuja el árbol real de rutas en `url` (sin `#`) y espera a que el router termine de cargar. */
async function abrir(url: string) {
  const router = createMemoryRouter(rutas, { initialEntries: [url] });
  await act(async () => {
    render(<RouterProvider router={router} />);
  });
  return router;
}

// Cada URL del panel, la página de features/ que dibuja (null: `/` solo redirige) y si va dentro del Shell.
const ESPERADO: Record<string, { pagina: string | null; panel: boolean }> = {
  '/': { pagina: null, panel: false },
  '/login': { pagina: 'auth/pages/LoginPage', panel: false },
  '/starter': { pagina: 'auth/pages/StarterPage', panel: false },
  '/consentimiento': { pagina: 'legal/pages/AceptarDocumentosPage', panel: false },
  '/legal/:doc?': { pagina: 'legal/pages/LegalPage', panel: false },
  '/admin': { pagina: 'admin/pages/AdminAgenciasPage', panel: false },
  '/admin/dispersiones': { pagina: 'admin/pages/AdminDispersionesPage', panel: false },
  '/onboarding': { pagina: 'agencias/pages/OnboardingPage', panel: true },
  '/perfil': { pagina: 'agencias/pages/PerfilAgenciaPage', panel: true },
  '/resenas': { pagina: 'resenas/pages/ResenasPage', panel: true },
  '/dashboard': { pagina: 'resumen/pages/ResumenPage', panel: true },
  '/planes': { pagina: 'planes/pages/PlanesPage', panel: true },
  '/planes/nuevo': { pagina: 'planes/pages/PlanFormPage', panel: true },
  '/planes/editar/:id?': { pagina: 'planes/pages/PlanFormPage', panel: true },
  '/ventas': { pagina: 'ventas/pages/VentasPage', panel: true },
  '/liquidaciones': { pagina: 'liquidaciones/pages/LiquidacionesPage', panel: true },
  '/liquidaciones/:id': { pagina: 'liquidaciones/pages/LiquidacionDetallePage', panel: true },
  '/cuenta-dispersiones': { pagina: 'liquidaciones/pages/CuentaDispersionPage', panel: true },
};

/** Una URL concreta para cada patrón (los parámetros con un valor de ejemplo). */
const url = (patron: string) => patron.replace(':doc?', 'privacidad').replace(':id?', 'p-1').replace(':id', 'liq-1');

describe('árbol de rutas', () => {
  it('tiene exactamente las rutas de antes de la migración (las de SvelteKit), más / → /starter y el 404', () => {
    const rutasDelArbol = aplanar(rutas).map((r) => r.ruta);
    expect(rutasDelArbol.filter((r) => r !== '/*').sort()).toEqual(Object.keys(ESPERADO).sort());
    expect(rutasDelArbol).toContain('/*');
  });

  it('las secciones de la agencia van dentro del Shell y las demás no', () => {
    const enPanel = Object.fromEntries(aplanar(rutas).map((r) => [r.ruta, r.enPanel]));
    for (const [patron, { panel }] of Object.entries(ESPERADO)) expect(enPanel[patron], patron).toBe(panel);
  });

  it.each(Object.entries(ESPERADO).filter(([, e]) => e.pagina))('%s dibuja %s', async (patron, { pagina, panel }) => {
    await abrir(url(patron));
    expect(propsDe(pagina!), pagina!).not.toBeNull();
    const dentroDelShell = !!document.querySelector(`[data-envoltorio="${PANEL}"] [data-pagina="${pagina}"]`);
    expect(dentroDelShell).toBe(panel);
  });

  it('editar pasa el id como planId y el detalle como id', async () => {
    await abrir('/planes/editar/p-1');
    expect(propsDe('planes/pages/PlanFormPage')).toEqual({ planId: 'p-1' });
    cleanup();
    await abrir('/planes/editar');
    expect(propsDe('planes/pages/PlanFormPage')).toEqual({});
    cleanup();
    await abrir('/planes/nuevo');
    expect(propsDe('planes/pages/PlanFormPage')).toEqual({});
    cleanup();
    await abrir('/liquidaciones/liq-1');
    expect(propsDe('liquidaciones/pages/LiquidacionDetallePage')).toEqual({ id: 'liq-1' });
  });

  it('legal pasa el documento como doc; sin documento, doc vacío', async () => {
    await abrir('/legal/privacidad');
    expect(propsDe('legal/pages/LegalPage')).toEqual({ doc: 'privacidad' });
    cleanup();
    await abrir('/legal');
    expect(propsDe('legal/pages/LegalPage')).toEqual({ doc: '' });
  });

  it.each(['/no-existe', '/planes/editar/p-1/otra', '/legal/privacidad/extra'])('%s no existe: 404 dentro del layout raíz', async (u) => {
    await abrir(u);
    expect(screen.getByRole('heading', { level: 1, name: 'No encontramos esta página' })).toBeTruthy();
    expect(document.querySelector('[data-pagina]')).toBeNull();
  });

  it.each(['/legal/terminos', '/legal/Privacidad', '/legal/constructor', '/legal/__proto__'])(
    'un documento legal que no existe (%s) es 404, como el matcher [[doc=doc]] de Kit',
    async (u) => {
      await abrir(u);
      expect(screen.getByRole('heading', { level: 1, name: 'No encontramos esta página' })).toBeTruthy();
      expect(propsDe('legal/pages/LegalPage')).toBeNull();
    },
  );
});
