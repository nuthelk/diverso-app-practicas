<script lang="ts">
  import MarcaTile from '$lib/shared/ui/MarcaTile.svelte';
  import Aviso from '$lib/shared/ui/Aviso.svelte';
  import Icono from '$lib/shared/ui/Icono.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';
  import { DOCUMENTOS, VERSION_LEGAL, type DocumentoLegal } from '../model/legal';

  let { doc }: { doc: string } = $props();

  const documento = $derived<DocumentoLegal | undefined>(
    DOCUMENTOS[doc as DocumentoLegal['id']],
  );
</script>

<div class="min-h-screen">
  <header class="sticky top-0 z-10 border-b border-linea bg-niebla/90 backdrop-blur">
    <div class="mx-auto flex h-[64px] max-w-[760px] items-center gap-3 px-4 sm:px-6">
      <MarcaTile tam={32} />
      <span class="font-titulo text-[19px] font-bold"><span class="max-sm:hidden">Diverso&nbsp;·&nbsp;</span>Documentos legales</span>
      <div class="flex-1"></div>
      <button class="btn btn-secundario whitespace-nowrap" onclick={() => history.back()}>
        <Icono trazo={ICONOS.atras} clase="size-3.5" />
        Volver
      </button>
    </div>
  </header>

  <article class="mx-auto max-w-[760px] px-5 py-10 sm:px-6">
    {#if !documento}
      <p class="text-tinta-2">Documento no encontrado.</p>
    {:else}
      <p class="etiqueta-seccion">VERSIÓN {VERSION_LEGAL.toUpperCase()}</p>
      <h1 class="mt-2 text-[34px] leading-[1.1] text-balance sm:text-[42px]">
        {documento.titulo}
      </h1>
      <p class="mt-3 text-[18px] leading-relaxed text-tinta-2">{documento.resumen}</p>

      <div class="mt-6">
        <Aviso role="note">
          Borrador para el piloto académico: debe revisarlo un abogado y completarse con los datos del
          responsable antes del lanzamiento comercial.
        </Aviso>
      </div>

      {#each documento.secciones as s}
        <section class="mt-9 border-t border-dashed border-linea pt-6">
          <h2 class="text-[24px] leading-[1.2]">{s.titulo}</h2>
          {#each s.parrafos as p}
            <p class="mt-3 text-[17px] leading-[1.7] text-tinta">{p}</p>
          {/each}
        </section>
      {/each}
    {/if}
  </article>
</div>
