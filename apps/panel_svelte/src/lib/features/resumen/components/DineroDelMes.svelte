<script lang="ts">
  import Curvas from '$lib/shared/ui/Curvas.svelte';
  import Helecho from '$lib/shared/ui/Helecho.svelte';
  import Icono from '$lib/shared/ui/Icono.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';
  import type { DineroDelMes } from '../model/resumen';

  /** La plata, una sola vez y sencilla: lo que le corresponde este mes y el próximo pago. */
  let {
    dinero,
    proximo,
  }: {
    dinero: DineroDelMes;
    proximo: { texto: string; monto: string | null };
  } = $props();
</script>

<section
  class="monte relative mt-11 grid gap-[18px] overflow-hidden rounded-[8px_34px_8px_34px] border border-bosque-2 bg-bosque px-5 py-[22px] text-sobre-bosque sm:px-8 sm:py-[26px] lg:grid-cols-[1.3fr_1fr] lg:items-center lg:gap-10"
  aria-labelledby="h-dinero"
  data-dinero
>
  <Curvas clase="-top-[60px] -right-[120px] h-[210px] w-[420px] text-sobre-bosque-2 opacity-20 lg:-top-10 lg:-right-5 lg:h-[310px] lg:w-[620px]" />
  <Helecho clase="-bottom-3.5 right-2 h-[126px] w-[84px] text-sobre-bosque-2 opacity-[0.22] lg:right-[18px] lg:-bottom-2.5 lg:h-[165px] lg:w-[110px]" />
  <div class="relative">
    <h2 id="h-dinero" class="text-[22px] leading-[1.2]">Este mes te corresponde</h2>
    <p class="font-titulo mt-1 text-[42px] leading-[1.1] font-bold tracking-[-0.01em] lg:text-[46px]" data-monto>{dinero.monto}</p>
    <p class="font-titulo mt-1.5 text-[16px] text-sobre-bosque-2" data-desglose>{dinero.desglose}</p>
  </div>
  <div class="relative border-t border-dashed border-sobre-bosque-2 pt-3.5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-9">
    <p class="font-titulo text-[19px]" data-proximo>
      {proximo.texto}
      {#if proximo.monto}<b class="text-[24px]">{proximo.monto}</b>{/if}
    </p>
    <a class="mt-1.5 inline-flex min-h-[44px] items-center gap-2 font-bold text-sobre-bosque underline underline-offset-4" href="#/liquidaciones">
      Ver liquidaciones <Icono trazo={ICONOS.flecha} />
    </a>
  </div>
</section>
