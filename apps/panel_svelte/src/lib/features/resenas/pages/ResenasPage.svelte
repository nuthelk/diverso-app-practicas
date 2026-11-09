<script lang="ts">
  import { tick } from 'svelte';
  import Pagina from '$lib/shared/ui/Pagina.svelte';
  import PageHeader from '$lib/shared/ui/PageHeader.svelte';
  import EsqueletoPagina from '$lib/shared/ui/EsqueletoPagina.svelte';
  import Tarjeta from '$lib/shared/ui/Tarjeta.svelte';
  import Empty from '$lib/shared/ui/Empty.svelte';
  import AlertaError from '$lib/shared/ui/AlertaError.svelte';
  import { mensajeError } from '$lib/shared/api/errores';
  import ResenaItem from '$lib/features/resumen/components/ResenaItem.svelte';
  import { resenasParaMostrar } from '$lib/features/resumen/model/resenas';
  import { resenasAgencia } from '../api/resenas.api';
  import { TAMANO_PAGINA, type ResenaAgencia } from '../model/resenas';

  /** Todas las reseñas de los planes de la agencia, la más nueva primero, de a 20 con «Cargar más». */
  let cargando = $state(true);
  let error = $state('');
  let resenas = $state<ResenaAgencia[]>([]);
  /** Una página corta es la última: no hay más que pedir. */
  let hayMas = $state(false);
  let cargandoMas = $state(false);
  let errorMas = $state('');
  /** Filas que ya trajo el servidor (no las de la lista: las repetidas se descartan) = desde dónde pide la siguiente página. */
  let pedidas = 0;
  let lista = $state<HTMLUListElement>();

  const mostradas = $derived(resenasParaMostrar(resenas));

  async function cargar() {
    cargando = true;
    error = '';
    try {
      const pagina = await resenasAgencia({ limite: TAMANO_PAGINA, desde: 0 });
      resenas = pagina;
      pedidas = pagina.length;
      hayMas = pagina.length === TAMANO_PAGINA;
    } catch (e) {
      error = mensajeError(e);
    } finally {
      cargando = false;
    }
  }

  /** Agrega la siguiente página sin tocar lo ya cargado; si falla, lo cargado se queda y se puede reintentar. */
  async function cargarMas() {
    if (cargandoMas) return;
    cargandoMas = true;
    errorMas = '';
    try {
      const pagina = await resenasAgencia({ limite: TAMANO_PAGINA, desde: pedidas });
      // Si llegó una reseña nueva entre dos páginas, todo se corre una fila: la última de antes vuelve a venir.
      const vistas = new Set(resenas.map((r) => r.id));
      const antes = resenas.length;
      resenas = [...resenas, ...pagina.filter((r) => !vistas.has(r.id))];
      pedidas += pagina.length;
      hayMas = pagina.length === TAMANO_PAGINA;
      await enfocarDesde(antes);
    } catch (e) {
      errorMas = mensajeError(e);
    } finally {
      cargandoMas = false;
    }
  }

  /** El foco va a la primera reseña nueva: quien usa teclado sigue leyendo ahí, aunque el botón desaparezca. */
  async function enfocarDesde(indice: number) {
    await tick();
    const item = lista?.children[Math.min(indice, lista.children.length - 1)] as HTMLElement | undefined;
    if (!item) return;
    item.tabIndex = -1;
    item.focus();
  }

  // Carga al montar (initState): llamada directa, sin $effect.
  cargar();
</script>

{#if cargando}
  <EsqueletoPagina ancho={820} filas={4} clase="h-24" />
{:else}
  <Pagina ancho={820}>
    <PageHeader titulo="Reseñas" atras={{ href: '#/dashboard', texto: 'Resumen' }}>
      {#snippet contexto()}Lo que escriben tus viajeros sobre tus planes, de la más nueva a la más antigua.{/snippet}
    </PageHeader>

    {#if error}
      <div class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <AlertaError>{error}</AlertaError>
        <button type="button" class="btn btn-secundario btn-chico" onclick={cargar}>Reintentar</button>
      </div>
    {:else if resenas.length === 0}
      <div class="mt-6 tarjeta">
        <Empty icono="info" titulo="Aún no tienes reseñas" mensaje="Aparecerán aquí cuando tus viajeros las escriban." />
      </div>
    {:else}
      <div class="mt-6">
        <Tarjeta etiqueta="Todas las reseñas">
          <ul class="grid gap-3" aria-busy={cargandoMas} bind:this={lista}>
            {#each mostradas as r (r.id)}
              <ResenaItem resena={r} />
            {/each}
          </ul>
        </Tarjeta>
      </div>

      {#if errorMas}
        <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <AlertaError>{errorMas}</AlertaError>
          <button type="button" class="btn btn-secundario btn-chico" onclick={cargarMas}>Reintentar</button>
        </div>
      {:else if hayMas}
        <div class="mt-4 flex justify-center">
          <button type="button" class="btn btn-secundario" onclick={cargarMas} disabled={cargandoMas}>
            {cargandoMas ? 'Cargando…' : 'Cargar más'}
          </button>
        </div>
      {/if}
    {/if}
  </Pagina>
{/if}
