<script lang="ts">
  import Icono from '$lib/shared/ui/Icono.svelte';
  import { ICONOS, type NombreIcono } from '$lib/shared/ui/iconos';
  import type { AvisoResumen } from '../model/resumen';

  /** «Por resolver»: lo que pide una acción de la agencia, lo urgente primero; sin nada pendiente, una línea tranquila. */
  let { avisos }: { avisos: AvisoResumen[] } = $props();

  const ICONO: Record<AvisoResumen['clave'], NombreIcono> = {
    verificacion: 'escudo',
    rnt: 'documento',
    salidas: 'calendario',
    cuenta: 'banco',
  };
</script>

<section class="mt-6" aria-labelledby="h-avisos">
  <h2 id="h-avisos" class="titulo-seccion">
    Por resolver
    {#if avisos.length > 0}
      <span
        class="font-titulo inline-grid h-[26px] min-w-[26px] place-items-center rounded-full bg-heliconia px-[7px] text-[15px] leading-none font-bold text-sobre-heliconia"
        data-cuenta
        aria-hidden="true">{avisos.length}</span
      >
      <span class="sr-only">({avisos.length} {avisos.length === 1 ? 'aviso' : 'avisos'})</span>
    {/if}
  </h2>

  {#if avisos.length === 0}
    <p class="mt-1.5 flex items-center gap-2 text-tinta-2" data-al-dia>
      <Icono trazo={ICONOS.check} clase="size-5 text-helecho" />
      Todo al día
    </p>
  {:else}
    <ul class="mt-3.5 grid gap-3.5 {avisos.length > 1 ? 'min-[1100px]:grid-cols-2' : ''}">
      {#each avisos as a (a.clave)}
        <li
          data-aviso={a.clave}
          class="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1.5 rounded-[8px_24px_8px_24px] border px-4 py-4 sm:grid-cols-[auto_1fr_auto] sm:px-5
            {a.urgente ? 'border-heliconia bg-heliconia-bg' : 'border-linea bg-superficie'}"
        >
          <span
            class="grid size-[42px] place-items-center rounded-brote sm:size-[46px] {a.urgente
              ? 'bg-heliconia text-sobre-heliconia'
              : 'bg-niebla-2 text-helecho'}"
          >
            <Icono trazo={ICONOS[ICONO[a.clave]]} clase="size-6" />
          </span>
          <div class="min-w-0">
            <p class="text-[13px] font-bold tracking-[0.07em] uppercase {a.urgente ? 'text-heliconia' : 'text-tinta-2'}">{a.etiqueta}</p>
            <h3 class="mt-px text-[18px] leading-[1.25] sm:text-[19px]">{a.texto}</h3>
          </div>
          {#if a.accion}
            <a
              class="btn col-span-full no-underline sm:col-span-1 {a.urgente
                ? 'bg-heliconia text-sobre-heliconia hover:brightness-110'
                : 'btn-primario'}"
              href={'ruta' in a.accion ? '#' + a.accion.ruta : a.accion.url}
              target={'url' in a.accion ? '_blank' : undefined}
              rel={'url' in a.accion ? 'noopener noreferrer' : undefined}
            >
              {a.accion.texto}
              <Icono trazo={ICONOS.flecha} />
            </a>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>
