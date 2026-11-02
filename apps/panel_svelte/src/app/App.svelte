<script lang="ts">
  import { auth } from '@/features/auth/auth.svelte';
  import { router, go, segmentos } from '@/shared/lib/router.svelte';
  import { toast } from '@/shared/lib/toast.svelte';
  import Login from '@/features/auth/LoginPage.svelte';
  import Starter from '@/features/auth/StarterPage.svelte';
  import Onboarding from '@/features/agencias/OnboardingPage.svelte';
  import Shell from './Shell.svelte';
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

  const seg = $derived(segmentos());

  // Guards de sesión (equivalen al redirect global de go_router).
  $effect(() => {
    if (!auth.ready) return;
    const publica =
      router.path === '/login' || router.path === '/starter' || router.path.startsWith('/legal/');
    if (!auth.userId && !publica) go('/login');
    if (auth.userId && router.path === '/login') go('/starter');
  });
</script>

{#if !auth.ready}
  <div class="grid min-h-screen place-items-center" role="status" aria-label="Cargando">
    <div class="size-7 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"></div>
  </div>
{:else if seg[0] === 'legal'}
  <Legal doc={seg[1] ?? ''} />
{:else if seg[0] === 'login'}
  <Login />
{:else if seg[0] === 'consentimiento'}
  <AceptarDocumentos />
{:else if seg[0] === 'starter'}
  <Starter />
{:else if seg[0] === 'admin' && seg[1] === 'dispersiones'}
  <AdminDispersiones />
{:else if seg[0] === 'admin'}
  <Admin />
{:else}
  <Shell>
    {#if seg[0] === 'onboarding'}
      <Onboarding />
    {:else if seg[0] === 'dashboard'}
      <Dashboard />
    {:else if seg[0] === 'planes' && seg[1] === 'nuevo'}
      <PlanForm />
    {:else if seg[0] === 'planes' && seg[1] === 'editar'}
      <PlanForm planId={seg[2]} />
    {:else if seg[0] === 'planes'}
      <Planes />
    {:else if seg[0] === 'ventas'}
      <Ventas />
    {:else if seg[0] === 'liquidaciones' && seg[1]}
      <LiquidacionDetalle id={seg[1]} />
    {:else if seg[0] === 'liquidaciones'}
      <Liquidaciones />
    {:else if seg[0] === 'cuenta-dispersiones'}
      <CuentaDispersion />
    {:else}
      <div class="p-10 text-slate-500">
        No encontramos esta sección. <a class="font-semibold text-brand-600 hover:underline" href="#/dashboard">Volver al resumen</a>
      </div>
    {/if}
  </Shell>
{/if}

{#if toast.mensaje}
  <div
    class="aparecer fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5
      text-[13px] font-semibold text-white shadow-xl dark:bg-slate-100 dark:text-slate-900"
    role="status"
  >
    {toast.mensaje}
  </div>
{/if}
