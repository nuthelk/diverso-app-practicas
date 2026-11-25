/** Un nodo de la prueba: un texto suelto o un elemento con hijos. */
type Nodo = string | { children?: readonly Nodo[] } | null;

/**
 * El texto de un elemento TAL CUAL se dibuja. Los `getByText` de RNTL lo normalizan (cambian todo
 * espacio, U+00A0 incluido, por uno común), así que no sirven para fijar dónde se puede partir.
 */
export function textoCrudo(nodo: Nodo): string {
  if (nodo === null) return '';
  if (typeof nodo === 'string') return nodo;
  return (nodo.children ?? []).map(textoCrudo).join('');
}
