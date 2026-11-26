/** Un nodo de la prueba: un texto suelto o un elemento con hijos. */
type TextNode = string | { children?: readonly TextNode[] } | null;

/**
 * El texto de un elemento TAL CUAL se dibuja. Los `getByText` de RNTL lo normalizan (cambian todo
 * espacio, U+00A0 incluido, por uno común), así que no sirven para fijar dónde se puede partir.
 */
export function rawText(node: TextNode): string {
  if (node === null) return '';
  if (typeof node === 'string') return node;
  return (node.children ?? []).map(rawText).join('');
}
