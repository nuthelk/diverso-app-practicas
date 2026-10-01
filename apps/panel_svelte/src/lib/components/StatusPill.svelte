<script lang="ts">
  import type { Snippet } from 'svelte';

  let { estado }: { estado: string } = $props();

  const MAPA: Record<string, { texto: string; clase: string }> = {
    verificado: { texto: 'Verificada', clase: 'bg-ok-500/12 text-ok-500' },
    rechazado: { texto: 'Rechazada', clase: 'bg-red-500/12 text-red-600' },
    pendiente: { texto: 'Pendiente', clase: 'bg-orange-500/12 text-orange-600' },
    confirmada: { texto: 'Confirmada', clase: 'bg-ok-500/12 text-ok-500' },
    pendiente_pago: { texto: 'Pendiente', clase: 'bg-orange-500/12 text-orange-600' },
    cancelada: { texto: 'Cancelada', clase: 'bg-red-500/12 text-red-600' },
    completada: { texto: 'Completada', clase: 'bg-slate-500/15 text-slate-500' },
    publicado: { texto: 'Publicado', clase: 'bg-ok-500/12 text-ok-500' },
    borrador: { texto: 'Borrador', clase: 'bg-slate-500/15 text-slate-500' },
    aprobado: { texto: 'Aprobado', clase: 'bg-ok-500/12 text-ok-500' },
    reembolsado: { texto: 'Reembolsado', clase: 'bg-slate-500/15 text-slate-500' },
  };

  const info = $derived(MAPA[estado] ?? { texto: estado, clase: 'bg-slate-500/15 text-slate-500' });
</script>

<span
  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10.5px] leading-5 font-bold whitespace-nowrap {info.clase}"
>{info.texto}</span
>
