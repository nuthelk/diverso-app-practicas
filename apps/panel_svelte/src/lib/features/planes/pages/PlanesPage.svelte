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
  import { confirmar } from '$lib/shared/lib/confirmar.svelte';
  import { cop, decimal1, fechaCorta, plural } from '$lib/shared/lib/format';
  import { etiquetaCategoria, fechasFuturas, resumenPlanes, type Plan } from '../model/plan';
  import { avisar } from '$lib/shared/lib/toast.svelte';
  import FechasModal from '../components/FechasModal.svelte';

  /** Cuántas próximas salidas se listan en cada plan; el resto se resume en «N más». */
  const SALIDAS_VISIBLES = 3;

  let cargando = $state(true);
  let error = $state('');
  let planes = $state<Plan[]>([]);
  let fechasDe = $state<Plan | null>(null);

  /** Carga la lista. Solo la primera carga y «Reintentar» muestran los marcadores; recargar tras un cambio no parpadea. */
  async function cargar() {
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

  function reintentar() {
    cargando = true;
    cargar();
  }

  $effect(() => {
    cargar();
  });

  async function alternarPublicacion(p: Plan) {
    const publicado = p.estado === 'publicado';
    const sinFechas = fechasFuturas(p).length === 0;
    const seguir = await confirmar(
      publicado
        ? {
            titulo: `¿Despublicar «${p.titulo}»?`,
            mensaje: 'Los viajeros dejarán de verlo en la app y no podrán hacer reservas nuevas. Podrás publicarlo de nuevo cuando quieras.',
            confirmar: 'Despublicar',
          }
        : {
            titulo: `¿Publicar «${p.titulo}»?`,
            mensaje:
              'Los viajeros lo verán en la app y podrán reservar.' +
              (sinFechas ? ' Todavía no tiene fechas con cupos, así que nadie podrá reservar hasta que agregues alguna.' : ''),
            confirmar: 'Publicar',
          },
    );
    if (!seguir) return;
    try {
      await publicarPlan(p.id, !publicado);
      avisar(publicado ? 'Plan pasado a borrador.' : 'Plan publicado: ya lo ven los viajeros.');
      await cargar();
    } catch (e) {
      avisar(mensajeError(e));
    }
  }
</script>

{#if cargando}
  <EsqueletoPagina filas={3} clase="h-44" />
{:else}
  <Pagina>
    <PageHeader titulo="Planes">
      {#snippet contexto()}{#if !error && planes.length > 0}{resumenPlanes(planes)}{:else}Los planes que vendes en Diverso.{/if}{/snippet}
      {#snippet accion()}
        {#if !error && planes.length > 0}
          <a href="#/planes/nuevo" class="btn btn-primario">
            <Icono trazo={ICONOS.mas} clase="size-4" />
            Nuevo plan
          </a>
        {/if}
      {/snippet}
    </PageHeader>

    {#if error}
      <div class="tarjeta mt-6">
        <Empty icono="sinConexion" titulo="No pudimos cargar tus planes" mensaje={error}>
          <button type="button" class="btn btn-secundario" onclick={reintentar}>Reintentar</button>
        </Empty>
      </div>
    {:else if planes.length === 0}
      <div class="tarjeta mt-6">
        <Empty icono="mapa" titulo="Aún no tienes planes" mensaje="Crea tu primer plan turístico; empieza como borrador y lo publicas cuando esté listo.">
          <a href="#/planes/nuevo" class="btn btn-primario">
            <Icono trazo={ICONOS.mas} clase="size-4" />
            Nuevo plan
          </a>
        </Empty>
      </div>
    {:else}
      <ul class="mt-6 grid grid-cols-[repeat(auto-fill,minmax(min(100%,460px),1fr))] gap-5">
        {#each planes as p (p.id)}
          {@const publicado = p.estado === 'publicado'}
          {@const futuras = fechasFuturas(p)}
          <li class="tarjeta flex flex-col overflow-hidden">
            <div class="flex items-start gap-4 px-5 pt-4">
              {#if p.fotos[0]}
                <img src={p.fotos[0]} alt="" class="size-16 shrink-0 rounded-hoja-chica object-cover" loading="lazy" />
              {/if}
              <div class="min-w-0 flex-1">
                <h2 class="line-clamp-2 text-seccion">{p.titulo}</h2>
                <p class="mt-1 text-detalle text-tinta-2">{p.destino} · {etiquetaCategoria(p.categoria)} · {p.duracion_texto}</p>
                <p class="mt-0.5 text-detalle text-tinta-2">
                  <span class="cifra text-cuerpo text-tinta">{cop(p.precio_cop)}</span> ·
                  {#if p.reviews_count > 0}
                    <span class="cifra">{decimal1(p.rating_promedio)}</span> de 5 · {p.reviews_count} {plural(p.reviews_count, 'reseña', 'reseñas')}
                  {:else}
                    Sin reseñas todavía
                  {/if}
                </p>
              </div>
              <StatusPill estado={p.estado} />
            </div>

            <div class="mx-5 mt-4 mb-4 border-t border-linea pt-3">
              <h3 class="etiqueta-seccion">Próximas salidas</h3>
              {#if futuras.length === 0}
                <p class="mt-2 flex items-start gap-2 rounded-campo bg-prueba-bg px-3 py-2 font-semibold text-prueba-ink">
                  <Icono trazo={ICONOS.alerta} clase="mt-[3px] size-4" />
                  Sin fechas con cupos — agrega fechas para vender
                </p>
              {:else}
                <ul class="mt-2 grid gap-1.5">
                  {#each futuras.slice(0, SALIDAS_VISIBLES) as d (d.id)}
                    {@const ocupacion = d.cupo_total > 0 ? Math.round(((d.cupo_total - d.cupo_disponible) / d.cupo_total) * 100) : 0}
                    <li class="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span class="cifra w-28 shrink-0">{fechaCorta(d.fecha)}</span>
                      <span class="h-2 w-24 shrink-0 overflow-hidden rounded-pildora border border-contorno bg-niebla-2" aria-hidden="true">
                        <span class="block h-full bg-helecho" style:width="{ocupacion}%"></span>
                      </span>
                      <span class="text-detalle text-tinta-2"><span class="cifra">{d.cupo_disponible}</span> {plural(d.cupo_disponible, 'libre', 'libres')} de {d.cupo_total}</span>
                    </li>
                  {/each}
                </ul>
                {#if futuras.length > SALIDAS_VISIBLES}
                  {@const mas = futuras.length - SALIDAS_VISIBLES}
                  <p class="mt-1.5 text-detalle text-tinta-2">y {mas} {plural(mas, 'salida más', 'salidas más')} en «Fechas y cupos»</p>
                {/if}
              {/if}
            </div>

            <div class="mt-auto flex flex-wrap items-center gap-1 border-t border-linea px-4 py-3">
              <a href={'#/planes/editar/' + p.id} class="btn btn-texto whitespace-nowrap">Editar</a>
              {#if publicado}
                <button type="button" class="btn btn-texto whitespace-nowrap" onclick={() => alternarPublicacion(p)}>Despublicar</button>
                <button type="button" class="btn btn-primario ml-auto whitespace-nowrap" onclick={() => (fechasDe = p)}>Fechas y cupos</button>
              {:else}
                <button type="button" class="btn btn-texto whitespace-nowrap" onclick={() => (fechasDe = p)}>Fechas y cupos</button>
                <button type="button" class="btn btn-primario ml-auto whitespace-nowrap" onclick={() => alternarPublicacion(p)}>Publicar</button>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
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
