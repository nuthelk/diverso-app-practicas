<script lang="ts">
  import Campo from '$lib/shared/ui/Campo.svelte';
  import Select from '$lib/shared/ui/Select.svelte';
  import { CATEGORIAS, type CategoriaValor, type PlanDraft } from '../../model/plan';
  import { componerDuracion, opcionesUnidad, type Unidad } from '../../model/duracion';
  import Seccion from './Seccion.svelte';

  /** Título, destino, categoría, precio y duración (cantidad + unidad → `duracionTexto`). `data-campo` deja que el resumen de errores lleve el foco al campo. */
  let {
    d = $bindable(),
    duracionCantidad = $bindable(),
    duracionUnidad = $bindable(),
    errorPrecio,
  }: {
    d: PlanDraft;
    duracionCantidad: number | null;
    duracionUnidad: Unidad;
    /** Por qué el precio no sirve; solo se pasa tras intentar guardar. */
    errorPrecio?: string;
  } = $props();

  const unidadesOpciones = $derived(opcionesUnidad(duracionCantidad));

  function componer() {
    d.duracionTexto = componerDuracion(duracionCantidad, duracionUnidad);
  }
</script>

<Seccion titulo="Lo esencial">
  <div class="space-y-3">
    <Campo etiqueta="Título del plan *">
      {#snippet control(atributos)}
        <input {...atributos} data-campo="titulo" required bind:value={d.titulo} class="campo" />
      {/snippet}
    </Campo>
    <div class="grid gap-3 min-[640px]:grid-cols-4">
      <Campo etiqueta="Destino *">
        {#snippet control(atributos)}
          <input {...atributos} data-campo="destino" required bind:value={d.destino} class="campo" />
        {/snippet}
      </Campo>
      <div>
        <span class="etiqueta-campo" aria-hidden="true">Categoría</span>
        <Select
          etiqueta="Categoría"
          opciones={CATEGORIAS.map((c) => ({ valor: c.valor, etiqueta: c.label }))}
          valor={d.categoria}
          onchange={(v) => (d.categoria = v as CategoriaValor)}
        />
      </div>
      <Campo
        etiqueta="Precio final COP *"
        ayuda="Es el precio final: lo que ve el viajero es lo que paga, sin cargos ocultos."
        error={errorPrecio}
      >
        {#snippet control(atributos)}
          <input
            {...atributos}
            data-campo="precio"
            type="number"
            min="1"
            required
            bind:value={d.precioCop}
            class="campo cifra"
            placeholder="150000"
          />
        {/snippet}
      </Campo>
      <div role="group" aria-labelledby="duracion-etiqueta">
        <span class="etiqueta-campo" id="duracion-etiqueta">Duración *</span>
        <div class="flex gap-2">
          <input
            type="number"
            min="1"
            required
            aria-label="Cantidad de la duración"
            bind:value={duracionCantidad}
            oninput={componer}
            class="campo cifra w-20 shrink-0 text-center"
          />
          <Select
            clase="flex-1"
            etiqueta="Unidad de la duración"
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
