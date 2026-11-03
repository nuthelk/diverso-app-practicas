import 'package:flutter/material.dart';

import 'app_radii.dart';
import 'app_text.dart';
import 'diverso_colors.dart';

/// Sistema de diseño Diverso: tokens + temas claro/oscuro.
///
/// Principios: minimalista y tipográfico — superficies tonales sin bordes,
/// esquinas generosas, una sola tinta de acento, jerarquía por tamaño/peso
/// y mucho aire. Nada de sombras duras ni decoración gratuita.
abstract final class AppTheme {
  // Marca ---------------------------------------------------------------
  static const Color seedViajero = Color(0xFF0E6E4F); // verde selva
  static const Color seedPanel = Color(0xFF2D4A73); // azul pizarra

  // Breakpoints (según skill de layouts responsivos) ---------------------
  static const double bpCompact = 640; // móvil → grid/columnas
  static const double bpMedium = 1000; // rail extendido en panel

  static ThemeData viajeroLight() => _build(seedViajero, Brightness.light);
  static ThemeData viajeroDark() => _build(seedViajero, Brightness.dark);
  static ThemeData panelLight() => _build(seedPanel, Brightness.light);
  static ThemeData panelDark() => _build(seedPanel, Brightness.dark);

  static ThemeData _build(Color seed, Brightness brightness) {
    final scheme = ColorScheme.fromSeed(seedColor: seed, brightness: brightness);
    final fondoPagina = brightness == Brightness.light
        ? const Color(0xFFFAFAF8)
        : const Color(0xFF101312);

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: fondoPagina,
      splashFactory: InkSparkle.splashFactory,
      visualDensity: VisualDensity.standard,
      appBarTheme: AppBarTheme(
        centerTitle: false,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        titleSpacing: 20,
        // Sólido y del color de la página: un AppBar fijo transparente deja ver pasar el contenido
        // por debajo (y bajo la barra de estado).
        backgroundColor: fondoPagina,
        surfaceTintColor: Colors.transparent,
        foregroundColor: scheme.onSurface,
        titleTextStyle: TextStyle(
          fontSize: AppText.enfasis,
          fontWeight: FontWeight.w700,
          letterSpacing: -.2,
          color: scheme.onSurface,
        ),
      ),
      textTheme: brightness == Brightness.light
          ? ThemeData.light().textTheme
          : ThemeData.dark().textTheme,
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(0, 52),
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(AppRadios.pill)),
          ),
          textStyle: const TextStyle(
            fontSize: AppText.enfasis,
            fontWeight: FontWeight.w700,
            letterSpacing: -.2,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(0, 48),
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(AppRadios.pill)),
          ),
          side: BorderSide(color: scheme.outlineVariant),
          textStyle: const TextStyle(fontSize: AppText.cuerpoGrande, fontWeight: FontWeight.w600),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(AppRadios.pill)),
          ),
          textStyle: const TextStyle(fontSize: AppText.cuerpo, fontWeight: FontWeight.w600),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: brightness == Brightness.light
            ? Colors.black.withValues(alpha: .04)
            : Colors.white.withValues(alpha: .05),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadios.field),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadios.field),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadios.field),
          borderSide: BorderSide(color: scheme.primary, width: 1.6),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadios.field),
          borderSide: BorderSide(color: scheme.error, width: 1.2),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadios.field),
          borderSide: BorderSide(color: scheme.error, width: 1.6),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      cardTheme: const CardThemeData(
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(AppRadios.card)),
        ),
      ),
      // El `labelStyle` del tema REEMPLAZA al del Material 3 (que traía el color), no se mezcla con
      // él: sin `color` el texto de los chips se pintaba blanco y en claro no se leía (bug U).
      chipTheme: ChipThemeData(
        shape: const StadiumBorder(),
        side: BorderSide.none,
        labelStyle: TextStyle(
          fontSize: AppText.detalle,
          fontWeight: FontWeight.w600,
          color: scheme.onSurface,
        ),
        deleteIconColor: scheme.onSurfaceVariant,
      ),
      // Barra inferior fija y sólida: íconos grandes, el activo en verde con su píldora.
      navigationBarTheme: NavigationBarThemeData(
        elevation: 0,
        height: 72,
        backgroundColor: scheme.surfaceContainerLowest,
        surfaceTintColor: Colors.transparent,
        indicatorColor: scheme.primaryContainer,
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            size: 28,
            color: states.contains(WidgetState.selected) ? scheme.primary : scheme.onSurfaceVariant,
          ),
        ),
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => TextStyle(
            fontSize: AppText.leyenda,
            fontWeight: states.contains(WidgetState.selected) ? FontWeight.w700 : FontWeight.w600,
            color: states.contains(WidgetState.selected) ? scheme.primary : scheme.onSurfaceVariant,
          ),
        ),
      ),
      navigationRailTheme: NavigationRailThemeData(
        elevation: 0,
        backgroundColor: Colors.transparent,
        indicatorColor: scheme.primaryContainer,
        selectedIconTheme: IconThemeData(color: scheme.onPrimaryContainer),
        selectedLabelTextStyle: TextStyle(
          color: scheme.onSurface,
          fontWeight: FontWeight.w700,
          fontSize: AppText.cuerpoChico,
        ),
        unselectedLabelTextStyle: TextStyle(
          color: scheme.onSurfaceVariant,
          fontWeight: FontWeight.w500,
          fontSize: AppText.cuerpoChico,
        ),
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: ButtonStyle(
          shape: WidgetStatePropertyAll(
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadios.pill)),
          ),
          textStyle: const WidgetStatePropertyAll(
            TextStyle(fontSize: AppText.cuerpoChico, fontWeight: FontWeight.w600),
          ),
        ),
      ),
      snackBarTheme: const SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(AppRadios.field)),
        ),
      ),
      dialogTheme: const DialogThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(AppRadios.sheet)),
        ),
      ),
      listTileTheme: const ListTileThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(AppRadios.field)),
        ),
      ),
      dividerTheme: DividerThemeData(color: scheme.outlineVariant.withValues(alpha: .5), space: 1),
      extensions: [
        if (brightness == Brightness.light) DiversoColors.claro else DiversoColors.oscuro,
      ],
    );
  }
}
