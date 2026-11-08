<script lang="ts">
  import Logo from '$lib/shared/ui/Logo.svelte';
  import Aviso from '$lib/shared/ui/Aviso.svelte';
  import Icono from '$lib/shared/ui/Icono.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/features/auth/model/auth.svelte';
  import { DOCUMENTOS, VERSION_LEGAL, type DocumentoLegal } from '../model/legal';
  import { destinoVolver } from '../model/volver';

  let { doc }: { doc: string } = $props();

  const documento = $derived<DocumentoLegal | undefined>(
    DOCUMENTOS[doc as DocumentoLegal['id']],
  );

  function volver() {
    const destino = destinoVolver(history.length, !!auth.userId);
    if (destino === 'atras') history.back();
    else goto('#' + destino);
  }
</script>

<div class="min-h-screen">
  <header class="sticky top-0 z-10 border-b border-linea bg-niebla/90 backdrop-blur">
    <div class="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4 sm:px-6">
      <Logo size={28} clase="text-helecho" />
      <span class="text-destacado font-bold"><span class="max-sm:hidden">Diverso&nbsp;·&nbsp;</span>Documentos legales</span>
      <div class="flex-1"></div>
      <button type="button" class="btn btn-secundario whitespace-nowrap" onclick={volver}>
        <Icono trazo={ICONOS.atras} clase="size-4" />
        Volver
      </button>
    </div>
  </header>

  <article class="mx-auto max-w-3xl px-5 py-10 sm:px-6">
    {#if !documento}
      <h1 class="text-pagina">No encontramos ese documento</h1>
      <p class="mt-2 text-cuerpo text-tinta-2">Estos son los documentos legales de Diverso:</p>
      <ul class="mt-4 space-y-2 text-cuerpo">
        {#each Object.values(DOCUMENTOS) as d}
          <li><a class="enlace" href={'#/legal/' + d.id}>{d.titulo}</a></li>
        {/each}
      </ul>
    {:else}
      <p class="etiqueta-seccion">VERSIÓN {VERSION_LEGAL.toUpperCase()}</p>
      <h1 class="mt-2 text-pagina text-balance">{documento.titulo}</h1>
      <p class="mt-3 text-destacado text-tinta-2">{documento.resumen}</p>

      <!-- Es un pendiente del equipo (revisión de un abogado antes del lanzamiento), no información para quien lee el documento. -->
      {#if import.meta.env.DEV}
        <div class="mt-6">
          <Aviso role="note">
            Solo en desarrollo. Borrador para el piloto académico: debe revisarlo un abogado y completarse con los datos del
            responsable antes del lanzamiento comercial.
          </Aviso>
        </div>
      {/if}

      {#each documento.secciones as s}
        <section class="mt-9 border-t border-linea pt-6">
          <h2 class="text-seccion">{s.titulo}</h2>
          {#each s.parrafos as p}
            <p class="mt-3 text-cuerpo leading-relaxed text-tinta">{p}</p>
          {/each}
        </section>
      {/each}
    {/if}
  </article>
</div>
