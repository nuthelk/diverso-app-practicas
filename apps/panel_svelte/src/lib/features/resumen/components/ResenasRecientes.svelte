<script lang="ts">
  import type { ResenaMostrada } from '../model/resenas';

  /** «Reseñas recientes»: estrellas, lo que escribió el viajero (si escribió), quién, qué plan y hace cuánto. */
  let { resenas }: { resenas: ResenaMostrada[] | null } = $props();
</script>

<section aria-labelledby="h-resenas" data-resenas>
  <h2 id="h-resenas" class="titulo-seccion">Reseñas recientes</h2>
  {#if resenas === null}
    <p class="mt-3.5 text-tinta-2" data-sin-carga>No pudimos cargar las reseñas ahora.</p>
  {:else if resenas.length === 0}
    <p class="mt-3.5 text-tinta-2" data-sin-resenas>Aún no tienes reseñas. Aparecerán aquí cuando tus viajeros las escriban.</p>
  {:else}
    <ul class="mt-3.5 grid gap-3">
      {#each resenas as r, i (i)}
        <li>
          <figure class="grid grid-cols-[auto_1fr] items-center gap-x-3 rounded-hoja border border-linea bg-superficie px-[18px] py-3.5" data-resena>
            <span class="col-start-1 row-start-1 inline-flex gap-0.5 text-pico" role="img" aria-label="{r.estrellas} de 5 estrellas">
              {#each [1, 2, 3, 4, 5] as n (n)}
                <svg class="size-[19px] {n > r.estrellas ? 'opacity-30' : ''}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" />
                </svg>
              {/each}
            </span>
            {#if r.texto}
              <blockquote class="font-titulo col-span-2 row-start-2 mt-2 text-[17px] leading-[1.45] italic">{r.texto}</blockquote>
            {/if}
            <figcaption class="col-start-2 row-start-1 min-w-0 text-right text-[15px] leading-tight text-tinta-2">
              <b class="block text-tinta">{r.nombre}</b>
              <span class="block">{r.plan} · <span class="font-titulo">{r.cuando}</span></span>
            </figcaption>
          </figure>
        </li>
      {/each}
    </ul>
  {/if}
</section>
