import { act } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Dimensions } from 'react-native';

import { DependenciesProvider, type Dependencias } from '@/composition';
import type { ModoTema } from '@/ui/theme';

import { dependenciasDePrueba } from './dependencias-de-prueba';
import { renderConTema } from '../ui/support/conTema';

/**
 * Monta una pantalla suelta (sin router) con el tema y la raíz de composición: el
 * `Provider<X>.value(...) + MaterialApp(home: …)` de los tests de vistas de Flutter.
 * Para la navegación usar `routerFalso` (ver `expo-router-falso.ts`).
 */
export function renderPantalla(
  ui: ReactElement,
  { dependencias = dependenciasDePrueba(), modo = 'light' }: { dependencias?: Dependencias; modo?: ModoTema } = {},
) {
  return renderConTema(<DependenciesProvider dependencias={dependencias}>{ui}</DependenciesProvider>, { modo });
}

const ventanaOriginal = Dimensions.get('window');

/** Tamaño de la ventana (`tester.view.physicalSize` con `devicePixelRatio = 1`). */
export async function fijarVentana(width: number, height = 1000) {
  const ventana = { width, height, scale: 1, fontScale: 1 };
  await act(async () => {
    Dimensions.set({ window: ventana, screen: ventana });
  });
}

export async function restaurarVentana() {
  await act(async () => {
    Dimensions.set({ window: ventanaOriginal, screen: ventanaOriginal });
  });
}
