<script lang="ts">
  import type { GrupoDia, NivelSalida } from '../model/resumen';

  let { grupos }: { grupos: GrupoDia[] } = $props();

  /** Marca breve para las salidas que piden atención; las normales no llevan nada. */
  const MARCAS: Record<NivelSalida, { texto: string; clase: string } | null> = {
    llena: { texto: 'Llena', clase: 'pildora-ok' },
    casi_llena: { texto: 'Casi llena', clase: 'pildora-alerta' },
    vacia: { texto: 'Sin reservas', clase: 'pildora-neutra' },
    normal: null,
  };
</script>

<section class="tarjeta" aria-labelledby="salidas-titulo">
  <div class="flex items-baseline justify-between px-5 pt-4">
    <h2 id="salidas-titulo" class="text-[15px] font-bold tracking-[-0.2px]">Próximas salidas</h2>
    <a href="#/planes" class="text-[13px] font-semibold text-acento-ink hover:underline">Ver todas</a>
  </div>

  {#if grupos.length === 0}
    <p class="px-5 pt-3 pb-5 text-[13.5px] text-slate-600 dark:text-slate-400">
      No tienes salidas próximas. Agrega fechas en la sección Planes.
    </p>
  {:else}
    <ol class="px-5 pt-2 pb-3">
      {#each grupos as g (g.fecha)}
        <li
          data-dia
          class="relative pl-[22px] before:absolute before:top-2.5 before:-bottom-1 before:left-1 before:w-0.5 before:rounded-sm
            before:bg-acento-ink/28 after:absolute after:top-[7px] after:left-0 after:size-2.5 after:rounded-full
            after:border-2 after:border-acento-ink after:bg-superficie last:before:bottom-auto last:before:h-2 dark:after:bg-ink-800"
        >
          <div data-dia-titulo class="flex items-baseline gap-2 pt-1 pb-0.5 text-[12px] font-bold text-acento-ink">
            {g.dia}
            <span class="font-medium text-slate-600 dark:text-slate-400">{g.relativo}</span>
          </div>
          <ul>
            {#each g.salidas as s (s.hora + s.titulo)}
              {@const marca = MARCAS[s.nivel]}
              <li data-salida class="grid grid-cols-[44px_1fr] items-center gap-x-3 gap-y-1 py-[9px] sm:grid-cols-[44px_1fr_150px]">
                <time class="text-[12.5px] font-bold text-slate-600 tabular-nums dark:text-slate-400">{s.hora}</time>
                <div class="min-w-0">
                  <b class="block truncate text-[13.5px] leading-[1.3] font-bold">{s.titulo}</b>
                  <span class="text-[12px] text-slate-600 dark:text-slate-400">{s.detalle}</span>
                </div>
                <div class="col-start-2 flex flex-col items-end gap-1 sm:col-start-auto">
                  <div class="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-600 tabular-nums dark:text-slate-400">
                    {#if marca}<span class="pildora {marca.clase}">{marca.texto}</span>{/if}
                    {s.ocupacion}
                  </div>
                  <div class="h-1.5 w-full overflow-hidden rounded-full bg-pista" aria-hidden="true">
                    <i data-ocupacion class="block h-full rounded-full bg-barra" style:width="{s.porcentaje}%"></i>
                  </div>
                </div>
              </li>
            {/each}
          </ul>
        </li>
      {/each}
    </ol>
  {/if}
</section>
