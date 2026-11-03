/// Escala tipográfica del sistema de diseño: solo los TAMAÑOS (`fontSize`).
///
/// El peso, la altura de línea, el interletraje y el color los decide cada sitio, igual que antes:
/// un `Text` hereda el resto del `bodyMedium` del tema (por eso no se reemplazan por los estilos
/// del `TextTheme`, que traen su propio interletraje y altura y cambiarían lo que se ve).
abstract final class AppText {
  static const double micro = 10.5;
  static const double nota = 11;
  static const double etiqueta = 11.5;
  static const double leyenda = 12;
  static const double leyendaGrande = 12.5;
  static const double detalle = 13;
  static const double cuerpoChico = 13.5;
  static const double cuerpo = 14;
  static const double cuerpoGrande = 14.5;
  static const double enfasis = 15;
  static const double enfasisGrande = 15.5;
  static const double subtitulo = 16;
  static const double subtituloGrande = 17;
  static const double encabezadoXs = 19;
  static const double encabezadoS = 20;
  static const double encabezadoM = 21;
  static const double encabezadoL = 22;
  static const double encabezadoXl = 24;
  static const double encabezado2xl = 25;
  static const double encabezado3xl = 26;

  /// Título de cada pestaña (Explorar, Agencias, Reservas, Perfil); ver `TituloPagina`.
  static const double tituloPagina = 28;

  /// Cifras y códigos que son el dato de la pantalla (código de reserva).
  static const double cifra = 30;

  /// Emoji de categoría cuando hace de foto.
  static const double emojiFoto = 40;

  /// Nombre de la marca en el panel de bienvenida.
  static const double marca = 42;
}
