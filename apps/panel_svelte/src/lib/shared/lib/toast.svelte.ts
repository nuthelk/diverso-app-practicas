/** Toast global mínimo (runes). */
export const toast = $state({ mensaje: '' });
let timer: ReturnType<typeof setTimeout> | undefined;

export function avisar(mensaje: string): void {
  toast.mensaje = mensaje;
  clearTimeout(timer);
  timer = setTimeout(() => (toast.mensaje = ''), 3200);
}
