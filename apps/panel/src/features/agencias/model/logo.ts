/** Logo de la agencia: validación previa a la subida, nombres de objeto y respaldo de iniciales. */

export const BUCKET_LOGOS = 'agency-logos';
/** Mismo tope y tipos que impone el bucket (0010): aquí se avisa antes de subir. */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

const EXTENSION_POR_TIPO: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/** Mensaje en español si el archivo no sirve de logo; null si se puede subir. */
export function validarLogo(archivo: { type: string; size: number }): string | null {
  if (!(archivo.type in EXTENSION_POR_TIPO)) return 'El logo debe ser una imagen PNG, JPG o WebP.';
  if (archivo.size === 0) return 'El archivo está vacío. Elige otra imagen.';
  if (archivo.size > LOGO_MAX_BYTES) {
    const mb = (archivo.size / (1024 * 1024)).toFixed(1);
    return `El logo pesa ${mb} MB y el máximo es 2 MB. Elige una imagen más liviana.`;
  }
  return null;
}

/** Ruta nueva en la carpeta de la agencia; el nombre cambia en cada subida para no servir el logo viejo de la caché. */
export function rutaNuevaLogo(agencyId: string, tipo: string): string {
  return `${agencyId}/logo-${Date.now().toString(36)}.${EXTENSION_POR_TIPO[tipo]}`;
}

/** Ruta del objeto si `logoUrl` es un logo de la carpeta de esta agencia en nuestro bucket; si no, null. */
export function rutaDeLogo(logoUrl: string | null | undefined, agencyId: string): string | null {
  const marca = `/storage/v1/object/public/${BUCKET_LOGOS}/`;
  const i = logoUrl?.indexOf(marca) ?? -1;
  if (!logoUrl || i < 0) return null;
  const ruta = logoUrl.slice(i + marca.length);
  return /^[^/?#]+\/[^/?#]+$/.test(ruta) && ruta.startsWith(agencyId + '/') ? ruta : null;
}

const CONECTORES = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en']);

/** Letras del círculo cuando no hay logo; mismas reglas que `AgenciaResumen.iniciales` de la app. */
export function inicialesAgencia(nombre: string): string {
  const palabras = nombre
    .trim()
    .split(/\s+/)
    .filter((p) => p && !CONECTORES.has(p.toLowerCase()));
  if (palabras.length === 0) return '?';
  if (palabras.length === 1) return palabras[0]!.slice(0, 2).toUpperCase();
  return (palabras[0]![0]! + palabras[1]![0]!).toUpperCase();
}

/** Colores de marca del círculo de iniciales (los de la app del viajero). */
const PALETA = ['#0E6E4F', '#2D4A73', '#7A4A21', '#6B3A5B', '#1F6F7A', '#8A4B14', '#4A6A2A', '#4F4A8A'];

/** Color estable por agencia: FNV-1a de 32 bits sobre el id, igual que `colorDeAgencia` de la app. */
export function colorDeAgencia(clave: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < clave.length; i++) {
    h = Math.imul(h ^ clave.charCodeAt(i), 0x01000193) >>> 0;
  }
  return PALETA[h % PALETA.length]!;
}
