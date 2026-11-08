<script lang="ts">
  import Tarjeta from '$lib/shared/ui/Tarjeta.svelte';
  import TablaDatos, { type Columna } from '$lib/shared/ui/TablaDatos.svelte';
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

  const COLUMNAS: Columna[] = [
    { clave: 'agencia', titulo: 'Agencia', principal: true },
    { clave: 'cuenta', titulo: 'Cuenta para dispersiones' },
    { clave: 'anticipos', titulo: 'Anticipos' },
  ];
</script>

<Tarjeta
  titulo="Anticipos por agencia"
  descripcion="Una agencia bloqueada deja de recibir anticipos nuevos; sus liquidaciones semanales siguen igual."
  sinRelleno
  clase="mt-10"
>
  <TablaDatos caption="Anticipos por agencia" columnas={COLUMNAS} filas={agencias} clave={(a) => a.id}>
    {#snippet celda(a, c)}
      {#if c.clave === 'agencia'}
        {a.nombre}
      {:else if c.clave === 'cuenta'}
        {textoCuenta(cuentaDe(a.id))}
      {:else}
        <span class="inline-flex flex-wrap items-center gap-2">
          <span class="pildora {a.anticipo_bloqueado ? 'pildora-alerta' : 'pildora-ok'}">
            {a.anticipo_bloqueado ? 'Bloqueados' : 'Habilitados'}
          </span>
          <button class="btn btn-chico {a.anticipo_bloqueado ? 'btn-secundario' : 'btn-peligro'}" onclick={() => onalternar(a)}>
            {a.anticipo_bloqueado ? 'Desbloquear anticipo' : 'Bloquear anticipo'}
          </button>
        </span>
      {/if}
    {/snippet}
    {#snippet vacio()}Aún no hay agencias verificadas.{/snippet}
  </TablaDatos>
</Tarjeta>
