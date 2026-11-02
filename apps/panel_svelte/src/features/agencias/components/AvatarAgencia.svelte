<script lang="ts">
  import { colorDeAgencia, inicialesAgencia } from '../logo';
  import type { Agency } from '../agencia';

  let {
    agencia,
    tam = 40,
    decorativo = false,
  }: {
    agencia: Pick<Agency, 'id' | 'nombre' | 'logo_url'>;
    tam?: number;
    /** Junto al nombre de la agencia el avatar no aporta nada a un lector de pantalla. */
    decorativo?: boolean;
  } = $props();

  let urlRota = $state<string | null>(null);

  const logo = $derived(agencia.logo_url || null);
  const mostrarImagen = $derived(logo !== null && logo !== urlRota);
</script>

{#if mostrarImagen}
  <img
    src={logo}
    alt={decorativo ? '' : `Logo de ${agencia.nombre}`}
    style="width:{tam}px;height:{tam}px"
    class="shrink-0 rounded-full border border-slate-200/80 bg-white object-cover dark:border-ink-600"
    onerror={() => (urlRota = logo)}
  />
{:else}
  <div
    role={decorativo ? undefined : 'img'}
    aria-label={decorativo ? undefined : `Iniciales de ${agencia.nombre}`}
    aria-hidden={decorativo ? 'true' : undefined}
    class="flex shrink-0 items-center justify-center rounded-full font-extrabold tracking-wide text-white"
    style="width:{tam}px;height:{tam}px;font-size:{tam * 0.36}px;background-color:{colorDeAgencia(agencia.id)}"
  >{inicialesAgencia(agencia.nombre)}</div
  >
{/if}
