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

<h2 class="mt-10 text-[18px] font-extrabold tracking-tight">Anticipos por agencia</h2>
<p class="mt-1 text-[12.5px] text-suave">
  Una agencia bloqueada deja de recibir anticipos nuevos; sus liquidaciones semanales siguen igual.
</p>
{#if agencias.length > 0}
  <ul class="tarjeta mt-3 divide-y divide-linea overflow-hidden">
    {#each agencias as a (a.id)}
      <li class="flex flex-wrap items-center gap-3 px-5 py-3">
        <div class="min-w-0 flex-1">
          <div class="truncate max-sm:break-words max-sm:whitespace-normal text-[14px] font-bold">{a.nombre}</div>
          <div class="text-[12px] text-suave">
            Anticipos: {a.anticipo_bloqueado ? 'bloqueados' : 'habilitados'} · {textoCuenta(cuentaDe(a.id))}
          </div>
        </div>
        <button
          class="btn {a.anticipo_bloqueado ? 'btn-secundario' : 'btn-peligro'} py-1.5"
          onclick={() => onalternar(a)}
        >
          {a.anticipo_bloqueado ? 'Desbloquear anticipo' : 'Bloquear anticipo'}
        </button>
      </li>
    {/each}
  </ul>
{/if}
