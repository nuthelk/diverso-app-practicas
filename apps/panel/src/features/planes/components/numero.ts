/**
 * El valor de un `<input type="number">` para el borrador: vacío → `null`, si no el número
 * (`+valor`). Así «vaciar el campo» sigue significando «sin valor» para las validaciones del modelo.
 */
export function numeroDe(valor: string): number | null {
  return valor === '' ? null : +valor;
}
