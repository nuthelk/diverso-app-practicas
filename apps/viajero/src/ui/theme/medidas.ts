/** Marca, breakpoint, espaciados y radios (`app_theme.dart`, `app_insets.dart`, `app_radii.dart`). */

export const AppTheme = {
  /** «Verde selva»: semilla de la app viajero. */
  seedViajero: '#0E6E4F',
  /** «Azul pizarra»: semilla del panel (no se usa en viajero). */
  seedPanel: '#2D4A73',
  /** Único breakpoint: ancho > 640 → grid/columnas. */
  bpCompact: 640,
} as const;

/**
 * `AppInsets` como estilos de padding de RN (se esparcen en `style`). Los `EdgeInsets.fromLTRB`
 * quedan con sus cuatro lados para no depender del orden de precedencia de RN.
 */
export const AppInsets = {
  /** Lista de una pestaña: aire a los lados y abajo, poco arriba. */
  lista: { paddingLeft: 20, paddingTop: 4, paddingRight: 20, paddingBottom: 24 },
  /** Catálogo, bajo el buscador. */
  listaConAire: { paddingLeft: 20, paddingTop: 8, paddingRight: 20, paddingBottom: 24 },
  /** Separación entre las tarjetas de una lista. */
  entreTarjetas: { paddingBottom: 14 },
  /** Avisos y tarjetas pequeñas. */
  tarjeta: { padding: 14 },
  /** Tarjetas de contenido. */
  tarjetaAmplia: { padding: 16 },
  /** Detalle del viaje, itinerario. */
  tarjetaGrande: { padding: 18 },
  /** Contenido de una pantalla de detalle. */
  contenido: { padding: 20 },
  /** Pantallas de un solo formulario o mensaje. */
  pantalla: { padding: 24 },
} as const;

/** `AppRadios`. Sueltos en widgets: chip de código 8, logo 20, ícono de consentimiento 18, tabla 16. */
export const AppRadios = {
  /** Campos, listas y avisos pequeños. */
  field: 14,
  /** Controles pequeños, miniaturas. */
  control: 12,
  card: 20,
  /** Diálogos. */
  sheet: 28,
  pill: 999,
} as const;
