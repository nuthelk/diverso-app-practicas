<script lang="ts">
  import MarcaTile from '$lib/shared/ui/MarcaTile.svelte';
  import { auth, signOut } from '$lib/features/auth/model/auth.svelte';

  let { href, texto }: { href: string; texto: string } = $props();
</script>

<header
  class="sticky top-0 z-20 flex min-h-[60px] flex-wrap items-center gap-x-3 gap-y-2 py-2 border-b border-linea bg-paper/90 px-4 backdrop-blur
    sm:px-6 lg:px-10 dark:bg-ink-950/90"
>
  <MarcaTile tam={36} />
  <div class="text-[15px] font-extrabold tracking-[-0.2px] max-sm:sr-only">Diverso · Administración</div>
  <a class="chip ml-1" {href}>{texto}</a>
  <div class="flex-1"></div>
  <span class="hidden text-[12.5px] text-suave md:inline">{auth.email}</span>
  <button class="btn btn-secundario py-1.5 text-[13px] whitespace-nowrap" onclick={() => signOut()}>Cerrar sesión</button>
</header>
