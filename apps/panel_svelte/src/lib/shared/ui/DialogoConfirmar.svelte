<script lang="ts">
  import Dialogo from './Dialogo.svelte';
  import { pendiente, responder } from '$lib/shared/lib/confirmar.svelte';
</script>

<!-- Se monta una vez en el layout raíz; `{#key}` rehace el diálogo si una pregunta nueva reemplaza a otra. -->
{#key pendiente.pregunta}
  {#if pendiente.pregunta}
    {@const p = pendiente.pregunta}
    <Dialogo abierto rol="alertdialog" titulo={p.titulo} descripcion={p.mensaje} oncerrar={() => responder(false)}>
      {#snippet pie()}
        <button type="button" class="btn btn-secundario" data-autofocus={p.peligro ? '' : undefined} onclick={() => responder(false)}>
          {p.cancelar ?? 'Cancelar'}
        </button>
        <button
          type="button"
          class="btn {p.peligro ? 'btn-urgente' : 'btn-primario'}"
          data-autofocus={p.peligro ? undefined : ''}
          onclick={() => responder(true)}
        >
          {p.confirmar ?? 'Confirmar'}
        </button>
      {/snippet}
    </Dialogo>
  {/if}
{/key}
