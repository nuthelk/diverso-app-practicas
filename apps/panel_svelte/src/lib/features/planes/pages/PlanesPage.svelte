<script lang="ts">
  import EsqueletoPagina from '$lib/shared/ui/EsqueletoPagina.svelte';
  import Pagina from '$lib/shared/ui/Pagina.svelte';
  import PageHeader from '$lib/shared/ui/PageHeader.svelte';
  import Icono from '$lib/shared/ui/Icono.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';
  import StatusPill from '$lib/shared/ui/StatusPill.svelte';
  import Empty from '$lib/shared/ui/Empty.svelte';
  import { misVentas } from '$lib/features/ventas/api/ventas.api';
  import { publicarPlan } from '../api/planes.api';
  import { mensajeError } from '$lib/shared/api/errores';
  import { cop, fechaCorta, plural } from '$lib/shared/lib/format';
  import { fechasFuturas, resumenPlanes, type Plan } from '../model/plan';
  import { avisar } from '$lib/shared/lib/toast.svelte';
  import FechasModal from '../components/FechasModal.svelte';

  let cargando = $state(true);
  let error = $state('');
  let planes = $state<Plan[]>([]);
  let fechasDe = $state<Plan | null>(null);

  async function cargar() {
    cargando = true;
    error = '';
    try {
      const r = await misVentas();
      planes = r.planes;
    } catch (e) {
      error = mensajeError(e);
    } finally {
      cargando = false;
    }
  }

  $effect(() => {
    cargar();
  });

  async function alternarPublicacion(p: Plan) {
    const publicado = p.estado === 'publicado';
    try {
      await publicarPlan(p.id, !publicado);
      avisar(publicado ? 'Plan pasado a borrador.' : 'Plan publicado en el catálogo 🎉');
      await cargar();
    } catch (e) {
      avisar(mensajeError(e));
    }
  }
</script>

{#if cargando}
  <EsqueletoPagina filas={3} clase="h-[150px]" />
{:else if error}
  <Empty icono="sinConexion" titulo="Sin conexión" mensaje={error} />
{:else if planes.length === 0}
  <Empty
    icono="mapa"
    titulo="Aún no tienes planes"
    mensaje="Crea tu primer plan turístico con la ficha estandarizada de Diverso."
  >
    <a href="#/planes/nuevo" class="btn btn-primario">
      <Icono trazo={ICONOS.mas} clase="size-4" />
      Nuevo plan
    </a>
  </Empty>
{:else}
  <Pagina>
    <PageHeader titulo="Mis planes">
      {#snippet contexto()}{resumenPlanes(planes)}{/snippet}
      {#snippet accion()}
        <a href="#/planes/nuevo" class="btn btn-primario">
          <Icono trazo={ICONOS.mas} clase="size-4" />
          Nuevo plan
        </a>
      {/snippet}
    </PageHeader>

    <ul class="mt-6 grid grid-cols-[repeat(auto-fill,minmax(min(100%,520px),1fr))] gap-5">
      {#each planes as p (p.id)}
        {@const publicado = p.estado === 'publicado'}
        {@const futuras = fechasFuturas(p)}
        <li class="tarjeta flex flex-col overflow-hidden">
          <div class="flex items-start gap-4 px-5 pt-5">
            {#if p.fotos[0]}
              <img src={p.fotos[0]} alt="" class="size-16 shrink-0 rounded-hoja-chica object-cover" loading="lazy" />
            {:else}
              <div class="flex size-16 shrink-0 items-center justify-center rounded-hoja-chica bg-relleno text-2xl" aria-hidden="true">
                {#each CATEGORIA_EMOJIS as ce}
                  {#if ce.valor === p.categoria}{ce.emoji}{/if}
                {/each}
              </div>
            {/if}
            <div class="min-w-0 flex-1">
              <h2 class="line-clamp-2 text-[22px] leading-[1.2]">{p.titulo}</h2>
              <p class="mt-1 text-[15px] leading-relaxed text-tinta-2">
                {p.destino} · {CATEGORIA_LABELS[p.categoria] ?? p.categoria} · {p.duracion_texto} ·
                <span class="cifra text-[17px] text-tinta">{cop(p.precio_cop)}</span> · ★
                <span class="cifra text-[17px] text-tinta">{p.rating_promedio.toFixed(1)}</span> ({p.reviews_count})
              </p>
            </div>
            <StatusPill estado={p.estado} />
          </div>

          <p
            class="mx-5 mt-4 mb-4 flex items-start gap-2.5 rounded-hoja-chica px-3.5 py-2.5 text-[15px] font-semibold
              {futuras.length === 0 ? 'bg-prueba-bg text-prueba-ink' : 'bg-niebla-2 text-tinta'}"
          >
            <Icono trazo={ICONOS.calendario} clase="mt-0.5 size-[18px] shrink-0" />
            <span>
              {futuras.length === 0
                ? 'Sin fechas futuras — agrega fechas para vender'
                : `${futuras.length} ${plural(futuras.length, 'fecha futura', 'fechas futuras')} · próximas: ${futuras
                    .slice(0, 3)
                    .map((d) => fechaCorta(d.fecha))
                    .join(', ')}`}
            </span>
          </p>

          <div class="mt-auto flex flex-wrap items-center gap-1 border-t border-dashed border-linea px-4 py-3">
            <a href={'#/planes/editar/' + p.id} class="btn btn-texto whitespace-nowrap">
              <Icono trazo={ICONOS.editar} clase="size-4" />
              Editar
            </a>
            <button type="button" class="btn btn-texto whitespace-nowrap" onclick={() => (fechasDe = p)}>
              <Icono trazo={ICONOS.calendario} clase="size-4" />
              Fechas y cupos
            </button>
            <button
              type="button"
              class="btn ml-auto whitespace-nowrap {publicado ? 'btn-secundario' : 'btn-primario'}"
              onclick={() => alternarPublicacion(p)}
            >
              {#if !publicado}<Icono trazo={ICONOS.publicar} clase="size-4" />{/if}
              {publicado ? 'Despublicar' : 'Publicar'}
            </button>
          </div>
        </li>
      {/each}
    </ul>
  </Pagina>
{/if}

{#if fechasDe}
  <FechasModal
    plan={fechasDe}
    oncerrar={() => {
      fechasDe = null;
      cargar();
    }}
  />
{/if}

<script module lang="ts">
  import { CATEGORIAS } from '../model/plan';
  export const CATEGORIA_LABELS = Object.fromEntries(CATEGORIAS.map((c) => [c.valor, c.label]));
  export const CATEGORIA_EMOJIS = CATEGORIAS;
</script>
