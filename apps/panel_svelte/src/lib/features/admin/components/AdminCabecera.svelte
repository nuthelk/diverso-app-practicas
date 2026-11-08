<script lang="ts">
  import Logo from '$lib/shared/ui/Logo.svelte';
  import Icono from '$lib/shared/ui/Icono.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';
  import { auth } from '$lib/features/auth/model/auth.svelte';
  import MenuCuenta from '$lib/features/auth/components/MenuCuenta.svelte';

  /**
   * La barra superior de administración, la misma del panel de agencias: marca, pestañas, el «Modo de prueba» (único
   * en las dos pantallas) y el menú de cuenta con el tema y la salida.
   */
  let { activa }: { activa: 'agencias' | 'dispersiones' } = $props();

  const SECCIONES = [
    { id: 'agencias', etiqueta: 'Agencias', href: '#/admin' },
    { id: 'dispersiones', etiqueta: 'Dispersiones', href: '#/admin/dispersiones' },
  ] as const;
</script>

<button type="button" class="saltar" onclick={() => document.getElementById('principal')?.focus()}>Saltar al contenido</button>

<header
  class="monte sticky top-0 z-40 flex min-h-[60px] flex-wrap items-center gap-x-3 gap-y-1 bg-bosque px-4 py-2 text-sobre-bosque lg:gap-x-5 lg:px-8"
>
  <a href="#/admin" class="mr-2 flex min-w-0 items-center gap-2.5 no-underline" aria-label="Diverso, administración, ir a agencias">
    <span class="grid size-[34px] shrink-0 place-items-center rounded-brote bg-bosque-2"><Logo size={22} /></span>
    <b class="text-destacado">Diverso</b>
    <small class="hidden text-detalle text-sobre-bosque-2 sm:block">Administración</small>
  </a>

  <nav aria-label="Secciones de administración" class="order-last w-full sm:order-none sm:w-auto">
    <ul class="flex items-center gap-0.5">
      {#each SECCIONES as s (s.id)}
        {@const actual = s.id === activa}
        <li>
          <a
            href={s.href}
            aria-current={actual ? 'page' : undefined}
            class="relative flex min-h-11 items-center rounded-pildora px-3.5 text-cuerpo text-sobre-bosque no-underline transition-colors hover:bg-bosque-2
              {actual ? 'bg-bosque-2 font-bold after:absolute after:inset-x-4 after:bottom-[3px] after:h-[3px] after:rounded-pildora after:bg-sobre-bosque' : 'font-semibold'}"
          >
            {s.etiqueta}
          </a>
        </li>
      {/each}
    </ul>
  </nav>

  <div class="ml-auto flex items-center gap-3">
    <p class="prueba" role="status">
      <Icono trazo={ICONOS.info} clase="size-4 max-[380px]:hidden" />
      <span>Modo de prueba<span class="max-[1180px]:hidden">: los pagos no mueven dinero real</span></span>
    </p>
    <MenuCuenta titulo="Administración">
      {#snippet estado()}{auth.email}{/snippet}
    </MenuCuenta>
  </div>
</header>
