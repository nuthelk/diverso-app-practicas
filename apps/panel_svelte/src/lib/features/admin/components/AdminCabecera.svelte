<script lang="ts">
  import MarcaTile from '$lib/shared/ui/MarcaTile.svelte';
  import Curvas from '$lib/shared/ui/Curvas.svelte';
  import { auth, signOut } from '$lib/features/auth/model/auth.svelte';

  let { href, texto }: { href: string; texto: string } = $props();
</script>

<header class="monte relative sticky top-0 z-20 overflow-hidden bg-bosque text-sobre-bosque">
  <Curvas clase="-top-[60px] -right-[40px] h-[200px] w-[440px] max-w-none text-sobre-bosque-2 opacity-20" />
  <div class="relative flex min-h-[64px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:px-6 lg:px-10">
    <MarcaTile tam={38} />
    <div class="font-titulo text-[21px] leading-tight font-bold max-sm:sr-only">Diverso · Administración</div>
    <a
      class="chip ml-1 border-sobre-bosque-2 text-sobre-bosque hover:bg-bosque-2"
      {href}>{texto}</a
    >
    <div class="flex-1"></div>
    <span class="hidden text-[14px] text-sobre-bosque-2 md:inline">{auth.email}</span>
    <button class="btn border border-sobre-bosque-2 whitespace-nowrap text-sobre-bosque hover:bg-bosque-2" onclick={() => signOut()}>
      Cerrar sesión
    </button>
  </div>
</header>
