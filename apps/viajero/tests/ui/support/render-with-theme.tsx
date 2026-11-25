import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, type ThemeMode } from '@/ui/theme';

const metrics = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 24, left: 0, right: 0, bottom: 0 },
};

/** Monta [ui] con el tema de la app (como `MaterialApp(theme: viajeroLight/Dark)` en Flutter). */
export function renderWithTheme(ui: ReactElement, { mode = 'light' }: { mode?: ThemeMode } = {}) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider initialMode={mode}>{ui}</ThemeProvider>
    </SafeAreaProvider>,
  );
}

export const testTopInset = metrics.insets.top;

/**
 * Íconos (decorativos, ocultos a lectores de pantalla): equivalente a `find.byIcon`. Devuelve el
 * tamaño y color que pinta el glifo.
 */
export function icons(name: string) {
  return screen.queryAllByTestId(`icono-${name}`, { includeHiddenElements: true }).map((el) => {
    const s = StyleSheet.flatten(el.props.style) ?? {};
    return { el, size: s.fontSize as number, color: s.color as string };
  });
}

export function icon(name: string) {
  const all = icons(name);
  if (all.length !== 1) throw new Error(`Se esperaba un ícono ${name} y hay ${all.length}`);
  return all[0];
}
