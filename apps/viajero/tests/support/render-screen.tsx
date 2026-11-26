import { act } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Dimensions } from 'react-native';

import { DependenciesProvider, type Dependencies } from '@/composition';
import type { ThemeMode } from '@/ui/theme';

import { testDependencies } from './test-dependencies';
import { renderWithTheme } from '../ui/support/render-with-theme';

/**
 * Monta una pantalla suelta (sin router) con el tema y la raíz de composición: el
 * `Provider<X>.value(...) + MaterialApp(home: …)` de los tests de vistas de Flutter.
 * Para la navegación usar `fakeRouter` (ver `fake-expo-router.ts`).
 */
export function renderScreen(
  ui: ReactElement,
  { dependencies = testDependencies(), mode = 'light' }: { dependencies?: Dependencies; mode?: ThemeMode } = {},
) {
  return renderWithTheme(<DependenciesProvider dependencies={dependencies}>{ui}</DependenciesProvider>, { mode });
}

const originalWindow = Dimensions.get('window');

/** Tamaño de la ventana (`tester.view.physicalSize` con `devicePixelRatio = 1`). */
export async function setWindowSize(width: number, height = 1000) {
  const windowSize = { width, height, scale: 1, fontScale: 1 };
  await act(async () => {
    Dimensions.set({ window: windowSize, screen: windowSize });
  });
}

export async function restoreWindowSize() {
  await act(async () => {
    Dimensions.set({ window: originalWindow, screen: originalWindow });
  });
}
