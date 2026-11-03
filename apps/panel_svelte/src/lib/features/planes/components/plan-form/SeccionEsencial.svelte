<script lang="ts">
  import Select from '$lib/shared/ui/Select.svelte';
  import { CATEGORIAS, type CategoriaValor, type PlanDraft } from '../../model/plan';
  import { componerDuracion, opcionesUnidad, type Unidad } from '../../model/duracion';
  import Seccion from './Seccion.svelte';

  /** Título, destino, categoría, precio y duración (cantidad + unidad → `duracionTexto`). */
  let {
    d = $bindable(),
    duracionCantidad = $bindable(),
    duracionUnidad = $bindable(),
  }: {
    d: PlanDraft;
    duracionCantidad: number | null;
    duracionUnidad: Unidad;
  } = $props();

  const unidadesOpciones = $derived(opcionesUnidad(duracionCantidad));

  function componer() {
    d.duracionTexto = componerDuracion(duracionCantidad, duracionUnidad);
  }
</script>

<Seccion titulo="LO ESENCIAL">
  <div class="space-y-3">
    <label class="block">
      <span class="etiqueta">Título del plan *</span>
      <input required bind:value={d.titulo} class="campo" />
    </label>
    <div class="grid gap-3 min-[640px]:grid-cols-4">
      <label>
        <span class="etiqueta">Destino *</span>
        <input required bind:value={d.destino} class="campo" />
      </label>
      <label>
        <span class="etiqueta">Categoría</span>
        <Select
          opciones={CATEGORIAS.map((c) => ({
            valor: c.valor,
            etiqueta: `${c.emoji} ${c.label}`,
          }))}
          valor={d.categoria}
          onchange={(v) => (d.categoria = v as CategoriaValor)}
        />
      </label>
      <label>
        <span class="etiqueta">Precio final COP *</span>
        <input
          type="number"
          min="1"
          required
          bind:value={d.precioCop}
          class="campo"
          placeholder="150000"
        />
      </label>
      <div>
        <span class="etiqueta">Duración *</span>
        <div class="flex gap-2">
          <input
            type="number"
            min="1"
            required
            bind:value={duracionCantidad}
            oninput={componer}
            class="campo w-[74px] shrink-0 text-center"
          />
          <Select
            clase="flex-1"
            opciones={unidadesOpciones}
            valor={duracionUnidad}
            onchange={(v) => {
              duracionUnidad = v as Unidad;
              componer();
            }}
          />
        </div>
      </div>
    </div>
  </div>
</Seccion>
