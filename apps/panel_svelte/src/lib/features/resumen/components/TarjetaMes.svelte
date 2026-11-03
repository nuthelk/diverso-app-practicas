<script lang="ts">
  import { cop } from '$lib/shared/lib/format';
  import { diaLargo, type ResumenMes } from '../model/resumen';

  let {
    mes,
    reparto,
    comisionPct,
    anterior,
    pago,
    pagoConsultado,
  }: {
    mes: ResumenMes;
    /** Porcentajes de la barra; null si no hay ventas. */
    reparto: { recibe: number; comision: number } | null;
    comisionPct: number;
    /** «En octubre: 13 reservas por $ 3.750.000.» */
    anterior: string;
    pago: { fecha: string; monto: number } | null;
    /** false si no se pudieron consultar las liquidaciones. */
    pagoConsultado: boolean;
  } = $props();

  const TEXTO_2 = 'text-slate-600 dark:text-slate-400';
</script>

<section class="tarjeta flex flex-col pb-4" aria-labelledby="mes-titulo" data-mes>
  <div class="flex items-baseline justify-between px-5 pt-4">
    <h2 id="mes-titulo" class="text-[15px] font-bold tracking-[-0.2px]">Este mes · {mes.mes}</h2>
    <a href="#/ventas" class="text-[13px] font-semibold text-acento-ink hover:underline">Ver ventas</a>
  </div>
  <p class="px-5 pt-0.5 text-[12.5px] {TEXTO_2}">Reservas pagadas de los viajes de {mes.mes}.</p>

  <div class="px-5 pt-[22px]">
    <small class="text-[12.5px] font-semibold {TEXTO_2}">Te corresponde</small>
    <div class="text-[38px] leading-[1.15] font-extrabold tracking-[-0.02em] text-ok-ink tabular-nums">{cop(mes.aRecibir)}</div>
  </div>

  {#if reparto}
    <div data-reparto class="mx-5 mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
      <i class="basis-0 bg-ok-500" style:flex-grow={reparto.recibe}></i>
      <i class="basis-0 bg-brand-200 dark:bg-brand-400" style:flex-grow={reparto.comision}></i>
    </div>
  {:else}
    <p class="mx-5 mt-4 text-[13px] {TEXTO_2}">Todavía no hay reservas pagadas en los viajes de {mes.mes}.</p>
  {/if}

  <dl class="mx-5 mt-[18px]">
    <div class="flex items-center justify-between border-t border-slate-200/80 py-[11px] text-[13.5px] dark:border-ink-600">
      <dt class="flex items-center gap-2 {TEXTO_2}"><span class="size-2 rounded-full bg-ok-500"></span>Vendiste</dt>
      <dd class="font-bold tabular-nums">{cop(mes.vendido)}</dd>
    </div>
    <div class="flex items-center justify-between border-t border-slate-200/80 py-[11px] text-[13.5px] dark:border-ink-600">
      <dt class="flex items-center gap-2 {TEXTO_2}">
        <span class="size-2 rounded-full bg-brand-400"></span>Comisión {comisionPct}&nbsp;%
      </dt>
      <dd class="font-bold tabular-nums">− {cop(mes.comision)}</dd>
    </div>
  </dl>
  <p class="px-5 pt-1.5 pb-4 text-[12px] {TEXTO_2}">{anterior}</p>

  <div class="mx-5 mt-auto flex items-center gap-3 rounded-xl bg-brand-600/10 px-3.5 py-3 dark:bg-brand-400/15">
    <svg class="size-[18px] shrink-0 text-acento-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
    </svg>
    <div>
      <small class="block text-[12px] {TEXTO_2}">Próximo pago</small>
      <b class="text-[13.5px] font-bold">
        {#if !pagoConsultado}No pudimos consultar tus pagos ahora.{:else if pago}{diaLargo(pago.fecha)}{:else}No tienes pagos pendientes por ahora.{/if}
      </b>
    </div>
    {#if pago}
      <span class="ml-auto text-[17px] font-extrabold tracking-[-0.02em] tabular-nums">{cop(pago.monto)}</span>
    {/if}
  </div>
</section>
