/** Las secciones del panel (el sendero del riel y la barra inferior del celular) y su estado activo. */

export interface Seccion {
  ruta: string;
  etiqueta: string;
  /** Nombre breve para la barra inferior móvil, si la etiqueta no cabe. */
  corta?: string;
  /** Trazo (`d`) del ícono de 24 × 24, en el trazo de línea del bosque. */
  icono: string;
}

export const SECCIONES: Seccion[] = [
  { ruta: '/dashboard', etiqueta: 'Resumen', icono: 'M2.5 19.5l6-10 3.8 6 2.4-3.2 6.8 7.2zM7.2 12.2l1.3 1.2 1.3-1.2' },
  {
    ruta: '/planes',
    etiqueta: 'Planes',
    icono: 'M3.8 18a2.2 2.2 0 104.4 0 2.2 2.2 0 10-4.4 0M15.8 6a2.2 2.2 0 104.4 0 2.2 2.2 0 10-4.4 0M8.2 18H15a3 3 0 000-6H9a3 3 0 010-6h6.8',
  },
  {
    ruta: '/ventas',
    etiqueta: 'Ventas',
    icono: 'M3 8a2 2 0 000 8v1.5A1.5 1.5 0 004.5 19h15a1.5 1.5 0 001.5-1.5V16a2 2 0 010-8V6.5A1.5 1.5 0 0019.5 5h-15A1.5 1.5 0 003 6.5zM14.5 5.5v13',
  },
  {
    ruta: '/liquidaciones',
    etiqueta: 'Liquidaciones',
    icono: 'M3 7a6 2.8 0 1012 0 6 2.8 0 10-12 0M3 7v4c0 1.5 2.7 2.8 6 2.8s6-1.3 6-2.8V7M3 11v4c0 1.5 2.7 2.8 6 2.8 1 0 1.9-.1 2.7-.3M13 16.5a4 4 0 108 0 4 4 0 10-8 0',
  },
  {
    ruta: '/cuenta-dispersiones',
    etiqueta: 'Cuenta para dispersiones',
    corta: 'Cuenta',
    icono: 'M3 9.5L12 4l9 5.5M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3 20h18',
  },
];

/** La ruta es la de la sección o cuelga de ella (`/planes/nuevo` está en `/planes`). */
export function esActiva(path: string, ruta: string): boolean {
  return path === ruta || path.startsWith(ruta + '/');
}

/** La sección a la que pertenece la ruta; null en páginas fuera del menú (p. ej. el registro de la agencia). */
export function seccionActual(path: string): Seccion | null {
  return SECCIONES.find((s) => esActiva(path, s.ruta)) ?? null;
}
