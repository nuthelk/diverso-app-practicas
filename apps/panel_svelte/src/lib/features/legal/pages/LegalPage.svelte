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
  <header class="sticky top-0 z-10 border-b border-linea bg-superficie/90 backdrop-blur dark:bg-ink-900/90">
    <div class="mx-auto flex h-[60px] max-w-[760px] items-center gap-3 px-4 sm:px-6">
      <MarcaTile tam={32} />
      <span class="text-[14px] font-extrabold tracking-tight"><span class="max-sm:hidden">Diverso&nbsp;·&nbsp;</span>Documentos legales</span>
      <div class="flex-1"></div>
      <button class="btn btn-secundario py-1.5 text-[12.5px] whitespace-nowrap" onclick={() => history.back()}>
        <Icono trazo={ICONOS.atras} clase="size-3.5" />
        Volver
      </button>
    </div>
  </header>

  <article class="mx-auto max-w-[760px] px-5 py-10 sm:px-6">
    {#if !documento}
      <p class="text-suave">Documento no encontrado.</p>
    {:else}
      <p class="etiqueta-seccion">VERSIÓN {VERSION_LEGAL.toUpperCase()}</p>
      <h1 class="mt-2 text-[28px] leading-tight font-extrabold tracking-tight sm:text-[30px]">
        {documento.titulo}
      </h1>
      <p class="mt-2 text-[15px] leading-relaxed text-suave">{documento.resumen}</p>

      <div class="mt-6">
        <Aviso role="note">
          Borrador para el piloto académico: debe revisarlo un abogado y completarse con los datos del
          responsable antes del lanzamiento comercial.
        </Aviso>
      </div>

      {#each documento.secciones as s}
        <section class="mt-8">
          <h2 class="text-[16px] font-bold tracking-tight">{s.titulo}</h2>
          {#each s.parrafos as p}
            <p class="mt-2.5 text-[14.5px] leading-[1.7] text-slate-700 dark:text-slate-300">{p}</p>
          {/each}
        </section>
      {/each}
    {/if}
  </article>
</div>
