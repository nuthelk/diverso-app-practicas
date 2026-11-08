<script lang="ts">
  import Campo from '$lib/shared/ui/Campo.svelte';
  import type { PlanDraft } from '../../model/plan';
  import type { ErroresPolitica } from '../../model/politica';
  import FotosPlan from './FotosPlan.svelte';
  import PoliticaCancelacion from './PoliticaCancelacion.svelte';
  import Seccion from './Seccion.svelte';

  let {
    d = $bindable(),
    errores,
    intentado,
    textoVistaPrevia,
  }: {
    d: PlanDraft;
    errores: ErroresPolitica;
    intentado: boolean;
    textoVistaPrevia: string;
  } = $props();
</script>

<Seccion titulo="Encuentro, cancelación y fotos">
  <div class="space-y-3">
    <div class="grid items-start gap-3 min-[640px]:grid-cols-[1fr_180px]">
      <Campo etiqueta="Punto de encuentro">
        {#snippet control(atributos)}
          <input {...atributos} bind:value={d.puntoEncuentro} class="campo" />
        {/snippet}
      </Campo>
      <Campo etiqueta="Hora de salida (hora de Colombia) *" error={intentado ? errores.horaSalida : undefined}>
        {#snippet control(atributos)}
          <input {...atributos} data-campo="horaSalida" type="time" required bind:value={d.horaSalida} class="campo cifra" />
        {/snippet}
      </Campo>
    </div>
    <PoliticaCancelacion bind:d {errores} {intentado} {textoVistaPrevia} />
    <FotosPlan bind:fotos={d.fotos} />
  </div>
</Seccion>
