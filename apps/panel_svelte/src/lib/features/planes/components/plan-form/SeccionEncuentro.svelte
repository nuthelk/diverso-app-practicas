<script lang="ts">
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
    <div class="grid items-end gap-3 min-[640px]:grid-cols-[1fr_180px]">
      <label class="block">
        <span class="etiqueta-campo">Punto de encuentro</span>
        <input bind:value={d.puntoEncuentro} class="campo" />
      </label>
      <label class="block">
        <span class="etiqueta-campo">Hora de salida (hora de Colombia) *</span>
        <input
          type="time"
          required
          bind:value={d.horaSalida}
          class="campo"
          aria-invalid={intentado && !!errores.horaSalida}
        />
      </label>
    </div>
    <PoliticaCancelacion bind:d {errores} {intentado} {textoVistaPrevia} />
    <FotosPlan bind:fotos={d.fotos} />
  </div>
</Seccion>
