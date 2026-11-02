<script lang="ts">
  import Logo from '$lib/shared/ui/Logo.svelte';
  import { auth, signOut } from '$lib/features/auth/auth.svelte';

  let { href, texto }: { href: string; texto: string } = $props();
</script>

<header
  class="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200/80 bg-white/90 px-5
    py-3 backdrop-blur sm:px-7 dark:border-ink-600 dark:bg-ink-900/90"
>
  <div class="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white">
    <Logo size={20} />
  </div>
  <div class="text-[15px] font-extrabold tracking-tight">Diverso · Administración</div>
  <a class="ml-3 text-[13px] font-semibold text-brand-600 hover:underline dark:text-brand-300" {href}>
    {texto}
  </a>
  <div class="flex-1"></div>
  <span class="hidden text-[12.5px] text-slate-400 sm:inline">{auth.email}</span>
  <button class="btn btn-secundario py-1.5 text-[13px]" onclick={() => signOut()}>
    Cerrar sesión
  </button>
</header>
