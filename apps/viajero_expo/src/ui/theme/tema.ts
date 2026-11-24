import {
  colorSchemeClaro,
  colorSchemeOscuro,
  colorTextoPorDefecto,
  conAlfa,
  DiversoColors,
  fondoPagina,
  type ColorScheme,
  type DiversoColorsTokens,
} from './colores';
import { AppRadios } from './medidas';
import { AppText, textTheme, type PesoFuente } from './tipografia';

export type Brillo = 'light' | 'dark';

/**
 * Componentes del tema (§3.7) ya resueltos para un modo. Los valores de tamaño/relleno se
 * midieron con `flutter test` sobre `AppTheme.viajeroLight/Dark` (no son los defaults de M3 de
 * memoria).
 */
export interface ComponentesDelTema {
  appBar: {
    backgroundColor: string;
    surfaceTintColor: 'transparent';
    foregroundColor: string;
    titleSpacing: number;
    toolbarHeight: number;
    titulo: { fontSize: number; fontWeight: PesoFuente; letterSpacing: number; color: string };
  };
  navigationBar: {
    height: number;
    backgroundColor: string;
    indicatorColor: string;
    iconSize: number;
    colorSeleccionado: string;
    colorNoSeleccionado: string;
    label: { fontSize: number; pesoSeleccionado: PesoFuente; peso: PesoFuente };
    /** Divider de 1 px encima de la barra. */
    divisor: string;
  };
  navigationRail: {
    indicatorColor: string;
    iconoSeleccionado: string;
    label: { fontSize: number; colorSeleccionado: string; color: string; pesoSeleccionado: PesoFuente; peso: PesoFuente };
  };
  input: {
    fillColor: string;
    radio: number;
    bordeFoco: { color: string; width: number };
    bordeError: { color: string; width: number };
    bordeFocoError: { color: string; width: number };
    cursor: string;
    cursorError: string;
  };
  chip: {
    backgroundColor: 'transparent';
    label: { fontSize: number; fontWeight: PesoFuente; color: string };
    deleteIconColor: string;
    avatarColor: string;
  };
  divider: { color: string; height: number };
  card: { backgroundColor: string; radio: number };
  snackBar: { radio: number };
  dialog: { radio: number };
  listTile: { radio: number };
  /** Overlay de «pressed» de M3 (10 % del color del contenido). */
  opacidadPresionado: number;
}

/** Tokens de un modo efectivo: lo que devuelve `useTheme()`. */
export interface Tema {
  brillo: Brillo;
  colorScheme: ColorScheme;
  diverso: DiversoColorsTokens;
  /** `scaffoldBackgroundColor` (≠ surface). */
  fondoPagina: string;
  /** Color de todo texto sin color propio (#1D1B20 / #E6E0E9). */
  colorTexto: string;
  textTheme: typeof textTheme;
  componentes: ComponentesDelTema;
}

function construirTema(brillo: Brillo): Tema {
  const claro = brillo === 'light';
  const cs = claro ? colorSchemeClaro : colorSchemeOscuro;
  const pagina = claro ? fondoPagina.claro : fondoPagina.oscuro;
  return {
    brillo,
    colorScheme: cs,
    diverso: claro ? DiversoColors.claro : DiversoColors.oscuro,
    fondoPagina: pagina,
    colorTexto: claro ? colorTextoPorDefecto.claro : colorTextoPorDefecto.oscuro,
    textTheme,
    componentes: {
      appBar: {
        backgroundColor: pagina,
        surfaceTintColor: 'transparent',
        foregroundColor: cs.onSurface,
        titleSpacing: 20,
        toolbarHeight: 56,
        titulo: { fontSize: AppText.enfasis, fontWeight: '700', letterSpacing: -0.2, color: cs.onSurface },
      },
      navigationBar: {
        height: 72,
        backgroundColor: cs.surfaceContainerLowest,
        indicatorColor: cs.primaryContainer,
        iconSize: 28,
        colorSeleccionado: cs.primary,
        colorNoSeleccionado: cs.onSurfaceVariant,
        label: { fontSize: AppText.leyenda, pesoSeleccionado: '700', peso: '600' },
        divisor: conAlfa(cs.outlineVariant, 0.5),
      },
      navigationRail: {
        indicatorColor: cs.primaryContainer,
        iconoSeleccionado: cs.onPrimaryContainer,
        label: {
          fontSize: AppText.cuerpoChico,
          colorSeleccionado: cs.onSurface,
          color: cs.onSurfaceVariant,
          pesoSeleccionado: '700',
          peso: '500',
        },
      },
      input: {
        fillColor: claro ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
        radio: AppRadios.field,
        bordeFoco: { color: cs.primary, width: 1.6 },
        bordeError: { color: cs.error, width: 1.2 },
        bordeFocoError: { color: cs.error, width: 1.6 },
        cursor: cs.primary,
        cursorError: cs.error,
      },
      chip: {
        // Medido: el InputChip de M3 sin `color` ni borde (side: none) es transparente.
        backgroundColor: 'transparent',
        label: { fontSize: AppText.detalle, fontWeight: '600', color: cs.onSurface },
        deleteIconColor: cs.onSurfaceVariant,
        avatarColor: cs.onSurfaceVariant,
      },
      divider: { color: conAlfa(cs.outlineVariant, 0.5), height: 1 },
      card: { backgroundColor: cs.surfaceContainerLow, radio: AppRadios.card },
      snackBar: { radio: AppRadios.field },
      dialog: { radio: AppRadios.sheet },
      listTile: { radio: AppRadios.field },
      opacidadPresionado: 0.1,
    },
  };
}

export const temaClaro: Tema = construirTema('light');
export const temaOscuro: Tema = construirTema('dark');

export function temaPara(brillo: Brillo): Tema {
  return brillo === 'dark' ? temaOscuro : temaClaro;
}
