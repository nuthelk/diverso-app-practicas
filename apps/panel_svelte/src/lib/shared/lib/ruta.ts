/** Ruta de una URL del router por hash: `http://host/#/planes?x=1` → `/planes`. */
export function rutaActual(url: URL): string {
  return url.hash.replace(/^#/, '').replace(/[?#].*/, '') || '/';
}
