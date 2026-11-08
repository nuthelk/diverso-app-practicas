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

<section class="tarjeta mt-5 overflow-hidden" aria-labelledby="h-avisos">
  <h2 id="h-avisos" class="flex items-center gap-2 border-b border-linea bg-niebla-2 px-4 py-2.5 text-cuerpo">
    Por resolver
    {#if avisos.length > 0}
      <span
        class="cifra inline-grid h-6 min-w-6 place-items-center rounded-full bg-heliconia px-1.5 text-detalle leading-none font-bold text-sobre-heliconia"
        data-cuenta
        aria-hidden="true">{avisos.length}</span
      >
      <span class="sr-only">({avisos.length} {avisos.length === 1 ? 'aviso' : 'avisos'})</span>
    {/if}
  </h2>

  {#if avisos.length === 0}
    <p class="flex items-center gap-2 px-4 py-3 text-tinta-2" data-al-dia>
      <Icono trazo={ICONOS.check} clase="size-5 text-helecho" />
      Todo al día
    </p>
  {:else}
    <ul>
      {#each avisos as a (a.clave)}
        <li
          data-aviso={a.clave}
          class="grid grid-cols-[auto_1fr] items-center gap-x-3.5 gap-y-1.5 border-t border-linea px-4 py-2.5 first:border-t-0 sm:grid-cols-[auto_1fr_auto]
            {a.urgente ? 'bg-heliconia-bg' : ''}"
        >
          <span
            class="grid size-9 place-items-center rounded-campo {a.urgente ? 'bg-heliconia text-sobre-heliconia' : 'bg-niebla-2 text-helecho'}"
          >
            <Icono trazo={ICONOS[ICONO[a.clave]]} clase="size-5" />
          </span>
          <p class="font-semibold">
            <span class="etiqueta-seccion mr-1.5 {a.urgente ? 'text-heliconia' : ''}">{a.etiqueta}</span>{a.texto}
          </p>
          {#if a.accion}
            <a
              class="btn btn-chico col-span-full sm:col-span-1 {a.urgente ? 'btn-urgente' : 'btn-primario'}"
              href={'ruta' in a.accion ? '#' + a.accion.ruta : a.accion.url}
              target={'url' in a.accion ? '_blank' : undefined}
              rel={'url' in a.accion ? 'noopener noreferrer' : undefined}
            >
              {a.accion.texto}
            </a>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>
