<script lang="ts">
  import PageHeader from '$lib/shared/ui/PageHeader.svelte';

  /** Cabecera de la pantalla: volver, título y botón de guardar (envía el formulario `form-plan`). */
  let { planId, guardando }: { planId?: string; guardando: boolean } = $props();
</script>

<PageHeader titulo={planId ? 'Editar plan' : 'Nuevo plan'} atras={{ href: '#/planes', texto: 'Volver' }}>
  {#snippet accion()}
    <button form="form-plan" type="submit" disabled={guardando} class="btn btn-primario">
      {guardando ? 'Guardando…' : 'Guardar'}
    </button>
  {/snippet}
</PageHeader>
