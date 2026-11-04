<script lang="ts">
  import { textoCuenta, type CuentaResumen } from '$lib/features/liquidaciones/model/liquidaciones';
  import type { Agency } from '$lib/features/agencias/model/agencia';

  let {
    agencias,
    cuentaDe,
    onalternar,
  }: {
    agencias: Agency[];
    cuentaDe: (agencyId: string) => CuentaResumen | undefined;
    onalternar: (agencia: Agency) => void;
  } = $props();
</script>

<h2 class="mt-12 text-[28px] leading-[1.15]">Anticipos por agencia</h2>
<p class="mt-1.5 text-[16px] text-tinta-2">
  Una agencia bloqueada deja de recibir anticipos nuevos; sus liquidaciones semanales siguen igual.
</p>
{#if agencias.length > 0}
  <ul class="tarjeta mt-3 divide-y divide-linea overflow-hidden">
    {#each agencias as a (a.id)}
      <li class="flex flex-wrap items-center gap-3 px-5 py-3.5">
        <div class="min-w-0 flex-1">
          <div class="font-titulo truncate text-[19px] leading-tight font-bold max-sm:break-words max-sm:whitespace-normal">{a.nombre}</div>
          <div class="text-[15px] text-tinta-2">
            Anticipos: {a.anticipo_bloqueado ? 'bloqueados' : 'habilitados'} · {textoCuenta(cuentaDe(a.id))}
          </div>
        </div>
        <button
          class="btn {a.anticipo_bloqueado ? 'btn-secundario' : 'btn-peligro'} "
          onclick={() => onalternar(a)}
        >
          {a.anticipo_bloqueado ? 'Desbloquear anticipo' : 'Bloquear anticipo'}
        </button>
      </li>
    {/each}
  </ul>
{/if}
