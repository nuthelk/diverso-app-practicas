<script lang="ts">
  /** Barra superior: volver, título y botón de guardar (envía el formulario `form-plan`). */
  let { planId, guardando }: { planId?: string; guardando: boolean } = $props();
</script>

<div class="flex items-center gap-3 py-5">
  <a
    href="#/planes"
    class="grid size-9 place-items-center rounded-full text-slate-500 transition
      hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-ink-700"
    title="Volver"
  >
    <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5m7 7l-7-7 7-7"/></svg>
  </a>
  <h1 class="text-[19px] font-extrabold tracking-tight">
    {planId ? 'Editar plan' : 'Nuevo plan'}
  </h1>
  <div class="flex-1"></div>
  <button
    form="form-plan"
    type="submit"
    disabled={guardando}
    class="rounded-full bg-brand-600 px-6 py-2 text-[13.5px] font-bold text-white transition
      hover:bg-brand-500 disabled:opacity-60"
  >
    {guardando ? 'Guardando…' : 'Guardar'}
  </button>
</div>
