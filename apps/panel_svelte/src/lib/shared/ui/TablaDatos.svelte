<script module lang="ts">
  export interface Columna {
    /** Campo de la fila que muestra la celda cuando no se dibuja a medida. */
    clave: string;
    titulo: string;
    /** Cifras: alineadas a la derecha. */
    num?: boolean;
    /** La celda que encabeza la tarjeta en pantallas angostas (sin título delante). */
    principal?: boolean;
  }
</script>

<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';

  /**
   * Tabla de datos. Con ancho suficiente es una tabla; en pantallas angostas (≤ 820 px) cada fila pasa a ser una tarjeta:
   * la columna `principal` arriba y las demás como «título: valor», sin ocultar ningún dato.
   * Si se da `celda`, esa función dibuja TODAS las celdas (recibe la fila y la columna).
   */
  let {
    caption,
    columnas,
    filas,
    clave,
    celda,
    vacio,
    pie,
    clase = '',
  }: {
    /** Qué contiene la tabla, para el lector de pantalla. */
    caption: string;
    columnas: Columna[];
    filas: T[];
    clave: (fila: T) => string;
    celda?: Snippet<[T, Columna]>;
    /** Qué se ve cuando no hay filas (con el motivo y, si se puede, qué hacer). */
    vacio?: Snippet;
    /** Filas de totales (`<tr>`s) dentro del `<tfoot>`. */
    pie?: Snippet;
    clase?: string;
  } = $props();

  // Al pasar a tarjetas la tabla deja de ser `display: table`; el rol explícito conserva su semántica para el lector de pantalla.
  const rol = (r: string) => ({ role: r });
</script>

<div class="tabla-datos overflow-x-auto {clase}">
  <table class="tabla" {...rol('table')}>
    <caption class="sr-only">{caption}</caption>
    <thead>
      <tr>
        {#each columnas as c (c.clave)}
          <th scope="col" class:num={c.num}>{c.titulo}</th>
        {/each}
      </tr>
    </thead>
    <tbody {...rol('rowgroup')}>
      {#each filas as fila (clave(fila))}
        <tr {...rol('row')}>
          {#each columnas as c (c.clave)}
            <td {...rol('cell')} data-th={c.titulo} data-principal={c.principal ? '' : undefined} class:num={c.num}>
              {#if celda}{@render celda(fila, c)}{:else}{(fila as Record<string, unknown>)[c.clave]}{/if}
            </td>
          {/each}
        </tr>
      {:else}
        <tr {...rol('row')}>
          <td {...rol('cell')} colspan={columnas.length} data-principal class="text-center text-tinta-2">
            {#if vacio}{@render vacio()}{/if}
          </td>
        </tr>
      {/each}
    </tbody>
    {#if pie}<tfoot {...rol('rowgroup')}>{@render pie()}</tfoot>{/if}
  </table>
</div>
