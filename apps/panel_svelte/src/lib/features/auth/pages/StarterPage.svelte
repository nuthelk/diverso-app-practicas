<script lang="ts">
  import MarcaTile from '$lib/shared/ui/MarcaTile.svelte';
  import Curvas from '$lib/shared/ui/Curvas.svelte';
  import Spinner from '$lib/shared/ui/Spinner.svelte';
  import { auth, perfilActual } from '../model/auth.svelte';
  import { goto } from '$app/navigation';
  import { miAgencia } from '$lib/features/agencias/api/agencias.api';
import { consentimientosPendientes } from '$lib/features/legal/api/legal.api';

  // Decisión de destino: admin → /admin; agencia sin registro → /onboarding.
  $effect(() => {
    if (!auth.ready || !auth.userId) return;
    (async () => {
      try {
        const perfil = await perfilActual();
        if (perfil.rol === 'admin') return goto('#/admin');
        const agencia = await miAgencia();
        if (!agencia) return goto('#/onboarding'); // el registro incluye la autorización
        const pendientes = await consentimientosPendientes();
        goto(pendientes.length > 0 ? '#/consentimiento' : '#/dashboard');
      } catch {
        goto('#/login');
      }
    })();
  });
</script>

<div class="relative grid min-h-screen place-items-center overflow-hidden" role="status" aria-label="Cargando">
  <Curvas clase="top-1/2 left-1/2 h-[420px] w-[840px] max-w-none -translate-x-1/2 -translate-y-1/2 text-musgo opacity-25" />
  <div class="relative flex flex-col items-center gap-5">
    <MarcaTile tam={56} />
    <Spinner />
  </div>
</div>
