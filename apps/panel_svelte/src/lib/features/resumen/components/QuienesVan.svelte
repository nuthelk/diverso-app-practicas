<script lang="ts">
  import AlertaError from '$lib/shared/ui/AlertaError.svelte';
  import Spinner from '$lib/shared/ui/Spinner.svelte';
  import { plural } from '$lib/shared/lib/format';
  import { diaLargo } from '../model/fechas';
  import { cuposDeSalida, type EstadoQuienes, type ReservaDeSalida } from '../model/quienes-van';
  import type { Salida } from '../model/salidas';

  /** «Quiénes van» de una salida: plan, día y hora, cupos y las reservas vivas (nombre corto y personas), nunca contacto. */
  let {
    salida,
    estado,
    reservas,
    onreintentar,
  }: {
    salida: Salida;
    estado: EstadoQuienes;
    reservas: ReservaDeSalida[];
    onreintentar: () => void;
  } = $props();
</script>

<p class="flex flex-wrap gap-x-6 gap-y-1 text-detalle text-tinta-2">
  <span data-q-fecha>
    <b class="text-tinta">Quiénes van</b> · {salida.titulo}, {diaLargo(salida.fecha)}, {salida.yaSalio ? 'salió' : 'sale'} a las {salida.hora}
  </span>
  <span data-q-cupos>{cuposDeSalida(salida)}</span>
</p>

<div aria-live="polite">
  {#if estado === 'cargando'}
    <div class="mt-3 flex items-center gap-2 text-tinta-2" role="status">
      <Spinner clase="size-5 motion-reduce:animate-none" /> Buscando quiénes van…
    </div>
  {:else if estado === 'error'}
    <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2" data-q-error>
      <AlertaError>No pudimos cargar quiénes van.</AlertaError>
      <button type="button" class="btn btn-secundario btn-chico" onclick={onreintentar}>Reintentar</button>
    </div>
  {:else if reservas.length === 0}
    <p class="mt-3 text-tinta-2" data-q-vacio>Aún nadie reservó esta salida</p>
  {:else}
    <ul class="mt-2 grid gap-x-8 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]" data-reservas>
      {#each reservas as r (r.id)}
        <li class="flex items-center gap-2.5 border-t border-linea py-2" data-reserva>
          <span class="min-w-0 font-semibold">{r.nombre}</span>
          {#if r.pendiente}<span class="pildora pildora-alerta" data-pendiente>pendiente de pago</span>{/if}
          <span class="cifra ml-auto font-normal whitespace-nowrap text-tinta-2" data-pax
            ><b class="text-tinta">{r.personas}</b> {plural(r.personas, 'persona', 'personas')}</span
          >
        </li>
      {/each}
    </ul>
  {/if}
</div>
