<script lang="ts">
  import Logo from '../components/Logo.svelte';
  import { DOCUMENTOS, VERSION_LEGAL, type DocumentoLegal } from '../legal';

  let { doc }: { doc: string } = $props();

  const documento = $derived<DocumentoLegal | undefined>(
    DOCUMENTOS[doc as DocumentoLegal['id']],
  );
</script>

<div class="min-h-screen bg-paper dark:bg-ink-950">
  <header
    class="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur
      dark:border-ink-600 dark:bg-ink-900/90"
  >
    <div class="mx-auto flex max-w-[760px] items-center gap-3 px-6 py-3">
      <div class="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
        <Logo size={18} />
      </div>
      <span class="text-[14px] font-extrabold tracking-tight"><span class="max-sm:hidden">Diverso · </span>Documentos legales</span>
      <div class="flex-1"></div>
      <button class="btn btn-secundario py-1.5 text-[12.5px] whitespace-nowrap" onclick={() => history.back()}>
        ← Volver
      </button>
    </div>
  </header>

  <article class="mx-auto max-w-[760px] px-6 py-10">
    {#if !documento}
      <p class="text-slate-500">Documento no encontrado.</p>
    {:else}
      <p class="text-[11px] font-bold tracking-[0.12em] text-slate-400">
        VERSIÓN {VERSION_LEGAL.toUpperCase()}
      </p>
      <h1 class="mt-2 text-[28px] leading-tight font-extrabold tracking-tight">
        {documento.titulo}
      </h1>
      <p class="mt-2 text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
        {documento.resumen}
      </p>

      <div
        class="mt-6 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-[12.5px]
          leading-relaxed text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
        role="note"
      >
        Borrador para el piloto académico: debe revisarlo un abogado y completarse con los datos del
        responsable antes del lanzamiento comercial.
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
