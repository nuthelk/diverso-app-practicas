<script lang="ts">
  import Skeleton from '@/shared/ui/Skeleton.svelte';
  import StatusPill from '@/shared/ui/StatusPill.svelte';
  import Empty from '@/shared/ui/Empty.svelte';
  import { misVentas } from '@/features/ventas/ventas.api';
import { publicarPlan } from './planes.api';
import { mensajeError } from '@/shared/api/errores';
  import { cop, fechaCorta } from '@/shared/lib/format';
  import { fechasFuturas, type Plan } from './plan';
  import { avisar } from '@/shared/lib/toast.svelte';
  import FechasModal from './components/FechasModal.svelte';

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
  <div class="space-y-3 p-7">
    {#each Array(3) as _}<Skeleton clase="h-[150px]" />{/each}
  </div>
{:else if error}
  <Empty icono="📡" titulo="Sin conexión" mensaje={error} />
{:else if planes.length === 0}
  <Empty
    icono="🗺️"
    titulo="Aún no tienes planes"
    mensaje="Crea tu primer plan turístico con la ficha estandarizada de Diverso."
  >
    <a
      href="#/planes/nuevo"
      class="rounded-full bg-brand-600 px-5 py-2.5 text-[13.5px] font-bold text-white transition hover:bg-brand-500"
    >
      + Nuevo plan
    </a>
  </Empty>
{:else}
  <div class="aparecer mx-auto max-w-[1100px] space-y-3 px-4 py-6 pb-24 sm:px-7">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-[24px] font-extrabold tracking-tight">Mis planes</h1>
      <a
        href="#/planes/nuevo"
        class="rounded-full bg-brand-600 px-5 py-2.5 text-[13.5px] font-bold text-white transition
          hover:bg-brand-500"
      >
        + Nuevo plan
      </a>
    </div>
    {#each planes as p (p.id)}
      {@const publicado = p.estado === 'publicado'}
      {@const futuras = fechasFuturas(p)}
      <div
        class="rounded-2xl border border-slate-200/80 bg-white p-4 transition hover:shadow-sm
          dark:border-ink-600 dark:bg-ink-800"
      >
        <div class="flex items-start gap-3.5">
          {#if p.fotos[0]}
            <img
              src={p.fotos[0]}
              alt=""
              class="size-[54px] shrink-0 rounded-[14px] object-cover"
              loading="lazy"
            />
          {:else}
            <div
              class="flex size-[54px] shrink-0 items-center justify-center rounded-[14px]
                bg-brand-600/12 text-xl"
            >
              {#each CATEGORIA_EMOJIS as ce}
                {#if ce.valor === p.categoria}{ce.emoji}{/if}
              {/each}
            </div>
          {/if}
          <div class="min-w-0 flex-1">
            <div class="line-clamp-2 text-[15px] font-bold leading-snug">{p.titulo}</div>
            <div class="mt-1 truncate text-[12.5px] text-slate-500 dark:text-slate-400">
              {p.destino} · {CATEGORIA_LABELS[p.categoria] ?? p.categoria} · {p.duracion_texto} ·
              {cop(p.precio_cop)} · ★ {p.rating_promedio.toFixed(1)} ({p.reviews_count})
            </div>
          </div>
          <StatusPill estado={p.estado} />
        </div>

        <p
          class="mt-3 text-[12.5px] font-medium
            {futuras.length === 0 ? 'text-orange-600' : 'text-brand-600 dark:text-brand-300'}"
        >
          {futuras.length === 0
            ? 'Sin fechas futuras — agrega fechas para vender'
            : `${futuras.length} fechas futuras · próximas: ${futuras
                .slice(0, 3)
                .map((d) => fechaCorta(d.fecha))
                .join(', ')}`}
        </p>

        <div class="mt-3.5 flex flex-wrap items-center gap-1 border-t border-slate-200/70 pt-3 dark:border-ink-600">
          <a
            href={'#/planes/editar/' + p.id}
            class="rounded-full px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap text-slate-600 transition
              hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-ink-700"
          >
            ✏️ Editar
          </a>
          <button
            class="rounded-full px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap text-slate-600 transition
              hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-ink-700"
            onclick={() => (fechasDe = p)}
          >
            📅 Fechas y cupos
          </button>
          <div class="flex-1"></div>
          <button
            class="rounded-full px-4 py-1.5 text-[13px] font-bold whitespace-nowrap transition
              {publicado
              ? 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-ink-700 dark:text-slate-400'
              : 'bg-ok-500/15 text-ok-600 hover:bg-ok-500/25'}"
            onclick={() => alternarPublicacion(p)}
          >
            {publicado ? 'Despublicar' : '🚀 Publicar'}
          </button>
        </div>
      </div>
    {/each}
  </div>
{/if}

{#if fechasDe}
  <FechasModal
    plan={fechasDe}
    oncCerrar={() => {
      fechasDe = null;
      cargar();
    }}
  />
{/if}

<script module lang="ts">
  import { CATEGORIAS } from './plan';
  export const CATEGORIA_LABELS = Object.fromEntries(CATEGORIAS.map((c) => [c.valor, c.label]));
  export const CATEGORIA_EMOJIS = CATEGORIAS;
</script>
