/** Las secciones del menú del panel y su estado activo. */

export interface Seccion {
  ruta: string;
  etiqueta: string;
  /** Nombre breve para la barra inferior móvil, si la etiqueta no cabe. */
  corta?: string;
  /** Trazo (`d`) del ícono de 24 × 24. */
  icono: string;
}

export const SECCIONES: Seccion[] = [
  { ruta: '/dashboard', etiqueta: 'Resumen', icono: 'M3 3h8v8H3V3zm10 0h8v5h-8V3zM3 13h8v8H3v-8zm10 3h8v5h-8v-5z' },
  {
    ruta: '/planes',
    etiqueta: 'Planes',
    icono: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  },
  {
    ruta: '/ventas',
    etiqueta: 'Ventas',
    icono: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    ruta: '/liquidaciones',
    etiqueta: 'Liquidaciones',
    icono: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    ruta: '/cuenta-dispersiones',
    etiqueta: 'Cuenta para dispersiones',
    corta: 'Cuenta',
    icono: 'M3 10h18M5 6l7-3 7 3M4 10v9m4-9v9m4-9v9m4-9v9m4-9v9M3 21h18',
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

/** Las dos primeras palabras del nombre: lo que cabe en el botón del usuario. */
export function nombreCorto(nombre: string): string {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).join(' ');
}
