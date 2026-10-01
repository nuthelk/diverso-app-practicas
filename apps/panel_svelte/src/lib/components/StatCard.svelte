<script lang="ts">
  let {
    icono,
    valor,
    etiqueta,
    color = '',
  }: { icono: string; valor: string; etiqueta: string; color?: string } = $props();
</script>

<div
  class="rounded-2xl border border-slate-200/80 bg-white p-5 transition-shadow hover:shadow-md
    dark:border-ink-600 dark:bg-ink-800 dark:hover:shadow-black/40"
>
  <div
    class="inline-flex rounded-xl p-2 text-[18px] {color ||
      'bg-brand-600/12 text-brand-600 dark:text-brand-300'}"
  >
    {icono}
  </div>
  <div class="mt-4 text-2xl font-extrabold tracking-tight tabular-nums">{valor}</div>
  <div class="mt-0.5 truncate text-[12.5px] text-slate-500 dark:text-slate-400">{etiqueta}</div>
</div>
