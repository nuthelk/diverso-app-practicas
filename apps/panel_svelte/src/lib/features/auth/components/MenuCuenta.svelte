<script lang="ts">
  import { tick, type Snippet } from 'svelte';
  import { page } from '$app/state';
  import Avatar from '$lib/shared/ui/Avatar.svelte';
  import Icono from '$lib/shared/ui/Icono.svelte';
  import Segmentado from '$lib/shared/ui/Segmentado.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';
  import { elegirTema, tema, type Preferencia } from '$lib/shared/lib/tema.svelte';
  import { rutaActual } from '$lib/shared/lib/ruta';
  import { signOut } from '../model/auth.svelte';

  /**
   * El menú de la cuenta, único en todo el panel: quién eres (título y estado), Términos y privacidad, el tema
   * (Sistema / Claro / Oscuro, el ÚNICO control de tema) y Cerrar sesión. No lista las secciones del panel; solo los
   * `enlaces` propios de la cuenta que le pase quien lo usa (el perfil de la agencia).
   * Se adapta al fondo: sobre el monte (`.monte`) el botón es de contorno claro.
   */
  let {
    titulo,
    estado,
    avatar,
    enlaces = [],
  }: {
    /** Nombre de la cuenta (la agencia); vacío mientras carga. */
    titulo: string;
    /** Ciudad, verificación… bajo el título dentro del menú. */
    estado?: Snippet;
    /** Imagen de la cuenta en el tamaño (px) que pida; por defecto las iniciales del título. */
    avatar?: Snippet<[number]>;
    /** Páginas de la cuenta (`ruta` del panel, sin `#`) que van arriba de Términos; la ruta actual lleva `aria-current`. */
    enlaces?: { ruta: string; texto: string; icono: string }[];
  } = $props();

  const uid = $props.id();
  const idPanel = `${uid}-panel`;
  const idTema = `${uid}-tema`;

  let abierto = $state(false);
  let raiz = $state<HTMLElement>();
  let boton = $state<HTMLButtonElement>();
  let panel = $state<HTMLElement>();

  const TEMAS = [
    { valor: 'sistema', etiqueta: 'Sistema', icono: ICONOS.monitor },
    { valor: 'claro', etiqueta: 'Claro', icono: ICONOS.sol },
    { valor: 'oscuro', etiqueta: 'Oscuro', icono: ICONOS.luna },
  ];

  const ruta = $derived(rutaActual(page.url));

  const ITEM =
    'flex min-h-11 w-full items-center gap-3 rounded-campo px-3 text-left text-cuerpo font-semibold text-tinta transition-colors hover:bg-niebla-2';

  // Al navegar se cierra (el menú no sigue abierto sobre la sección nueva).
  $effect(() => {
    void page.url;
    abierto = false;
  });

  async function abrir() {
    abierto = true;
    await tick();
    panel?.querySelector<HTMLElement>('a[href], button')?.focus();
  }

  function cerrar(devolverFoco = false) {
    abierto = false;
    if (devolverFoco) boton?.focus();
  }

  function alTeclear(e: KeyboardEvent) {
    if (e.key === 'Escape' && abierto) cerrar(true);
  }

  function alHacerClic(e: MouseEvent) {
    if (abierto && !raiz?.contains(e.target as Node)) cerrar();
  }

  function alPerderFoco(e: FocusEvent) {
    const destino = e.relatedTarget as Node | null;
    if (abierto && destino && !raiz?.contains(destino)) cerrar();
  }
</script>

<svelte:window onkeydown={alTeclear} onclick={alHacerClic} />

<div class="relative" bind:this={raiz} onfocusout={alPerderFoco}>
  <button
    type="button"
    bind:this={boton}
    class="inline-flex min-h-11 items-center gap-1.5 rounded-pildora border border-contorno bg-superficie py-1 pr-2.5 pl-1.5 text-tinta
      transition-colors hover:bg-niebla-2 in-[.monte]:border-sobre-bosque-2 in-[.monte]:bg-transparent in-[.monte]:text-sobre-bosque
      in-[.monte]:hover:bg-bosque-2"
    aria-label={titulo ? `Cuenta de ${titulo}` : 'Cuenta'}
    aria-expanded={abierto}
    aria-controls={idPanel}
    onclick={() => (abierto ? cerrar() : abrir())}
    onkeydown={(e) => {
      if (e.key === 'ArrowDown' && !abierto) {
        e.preventDefault();
        abrir();
      }
    }}
  >
    {#if avatar}{@render avatar(32)}{:else}<Avatar iniciales={titulo} tam={32} />{/if}
    <Icono trazo={ICONOS.chevron} clase="size-4 transition-transform {abierto ? 'rotate-180' : ''}" />
  </button>

  <div
    id={idPanel}
    bind:this={panel}
    hidden={!abierto}
    role="group"
    aria-label="Cuenta"
    class="aparecer absolute top-[calc(100%+8px)] right-0 z-[60] w-[292px] max-w-[calc(100vw-24px)] rounded-hoja border border-linea
      bg-superficie p-2 text-tinta shadow-[0_18px_40px_-12px_rgb(0_0_0/0.35)] [--anillo:var(--foco)]"
  >
    <div class="mb-1.5 flex items-center gap-3 border-b border-linea px-2 pt-2 pb-3">
      {#if avatar}{@render avatar(42)}{:else}<Avatar iniciales={titulo} tam={42} />{/if}
      <div class="min-w-0">
        <p class="font-bold leading-tight [overflow-wrap:anywhere]">{titulo}</p>
        {#if estado}<div class="mt-0.5 flex flex-wrap items-center gap-1.5 text-detalle text-tinta-2">{@render estado()}</div>{/if}
      </div>
    </div>

    {#each enlaces as e (e.ruta)}
      <a href={'#' + e.ruta} class={ITEM} aria-current={ruta === e.ruta ? 'page' : undefined}>
        <Icono trazo={e.icono} />
        {e.texto}
      </a>
    {/each}

    <a href="#/legal/terminos-agencias" class={ITEM}>
      <Icono trazo={ICONOS.documento} />
      Términos y privacidad
    </a>

    <div class="px-2 pt-2 pb-2.5">
      <span id={idTema} class="mb-1.5 block text-detalle font-bold text-tinta-2">Tema</span>
      <Segmentado opciones={TEMAS} valor={tema.preferencia} etiquetadoPor={idTema} onchange={(v) => elegirTema(v as Preferencia)} />
    </div>

    <div class="mt-1 border-t border-linea pt-1.5">
      <button
        type="button"
        class={ITEM}
        onclick={() => {
          cerrar();
          signOut();
        }}
      >
        <Icono trazo={ICONOS.salir} />
        Cerrar sesión
      </button>
    </div>
  </div>
</div>
