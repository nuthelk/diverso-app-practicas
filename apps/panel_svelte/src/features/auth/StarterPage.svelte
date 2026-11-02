<script lang="ts">
  import { auth, perfilActual } from './auth.svelte';
  import { go } from '@/shared/lib/router.svelte';
  import { miAgencia } from '@/features/agencias/agencias.api';
import { consentimientosPendientes } from '@/features/legal/legal.api';

  // Decisión de destino: admin → /admin; agencia sin registro → /onboarding.
  $effect(() => {
    if (!auth.ready || !auth.userId) return;
    (async () => {
      try {
        const perfil = await perfilActual();
        if (perfil.rol === 'admin') return go('/admin');
        const agencia = await miAgencia();
        if (!agencia) return go('/onboarding'); // el registro incluye la autorización
        const pendientes = await consentimientosPendientes();
        go(pendientes.length > 0 ? '/consentimiento' : '/dashboard');
      } catch {
        go('/login');
      }
    })();
  });
</script>

<div class="grid min-h-screen place-items-center">
  <div class="size-7 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"></div>
</div>
