<script lang="ts">
  import Spinner from '$lib/shared/ui/Spinner.svelte';
  import { diaLargo } from '../model/fechas';
  import { cuposDeSalida, puntosDeCupos, type EstadoQuienes, type ReservaDeSalida } from '../model/quienes-van';
  import type { SalidaSemana } from '../model/semana';

  /** El contenido de «Quiénes van» (el panel lateral y la hoja del celular lo comparten). */
  let {
    salida,
    estado,
    reservas,
    onreintentar,
  }: {
    /** null: todavía no se eligió una salida. */
    salida: SalidaSemana | null;
    estado: EstadoQuienes;
    reservas: ReservaDeSalida[];
    onreintentar: () => void;
  } = $props();

  const puntos = $derived(salida ? puntosDeCupos(salida.reservados, salida.total) : null);
</script>

{#if !salida}
  <p class="text-tinta-2" data-sin-salida>Elige una salida para ver quiénes van.</p>
{:else}
  <p class="font-titulo text-[19px] leading-[1.25] font-bold" data-q-plan>{salida.titulo}</p>
  <p class="font-titulo mt-0.5 text-tinta-2" data-q-fecha>
    {diaLargo(salida.fecha)} · {salida.yaSalio ? 'salió' : 'sale'} a las {salida.hora}
  </p>

  <div class="mt-3.5 rounded-[4px_14px_4px_14px] border border-linea bg-niebla px-3.5 py-3">
    <p class="font-titulo" data-q-cupos>{cuposDeSalida(salida)}</p>
    {#if puntos}
      <div class="mt-2 grid grid-cols-[repeat(12,1fr)] gap-[5px] max-lg:grid-cols-[repeat(18,1fr)] max-lg:gap-[3px]" aria-hidden="true" data-puntos>
        {#each { length: puntos.total } as _, i (i)}
          <i
            class="aspect-square rounded-[50%_50%_50%_14%] border-[1.5px] {i < puntos.llenos ? 'border-helecho bg-helecho' : 'border-contorno'}"
            data-lleno={i < puntos.llenos ? '' : undefined}
          ></i>
        {/each}
      </div>
    {/if}
  </div>

  <div aria-live="polite">
    {#if estado === 'cargando'}
      <div class="mt-4 flex items-center gap-2 text-tinta-2" role="status">
        <Spinner clase="size-5" /> Buscando quiénes van…
      </div>
    {:else if estado === 'error'}
      <div class="mt-4 rounded-[4px_14px_4px_14px] bg-heliconia-bg px-3.5 py-3 text-heliconia" role="alert" data-q-error>
        <p class="font-bold">No pudimos cargar quiénes van.</p>
        <button type="button" class="btn mt-2 bg-heliconia text-sobre-heliconia hover:brightness-110" onclick={onreintentar}>Reintentar</button>
      </div>
    {:else if reservas.length === 0}
      <p class="mt-4 text-tinta-2" data-q-vacio>Aún nadie reservó esta salida</p>
    {:else}
      <h3 class="mt-4 font-sans text-[14px] font-normal tracking-[0.08em] text-tinta-2 uppercase">Reservas ({reservas.length})</h3>
      <ul class="mt-0.5" data-reservas>
        {#each reservas as r (r.id)}
          <li class="flex items-center gap-3 border-b border-dashed border-linea py-2.5 last:border-b-0 max-lg:py-1.5" data-reserva>
            <span
              class="font-titulo grid size-[38px] shrink-0 place-items-center rounded-brote bg-relleno text-[18px] leading-none font-bold text-tinta"
              aria-hidden="true">{r.nombre.charAt(0)}</span
            >
            <span class="min-w-0">
              <span class="block text-[18px] leading-tight font-bold">{r.nombre}</span>
              {#if r.pendiente}<span class="pildora pildora-alerta mt-0.5" data-pendiente>pendiente de pago</span>{/if}
            </span>
            <span class="font-titulo ml-auto shrink-0 text-tinta-2" data-pax><b class="text-[18px] text-tinta">{r.personas}</b> {r.personas === 1 ? 'persona' : 'personas'}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}
