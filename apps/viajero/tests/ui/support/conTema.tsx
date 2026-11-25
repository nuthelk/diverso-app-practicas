import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, type ModoTema } from '@/ui/theme';

const metricas = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 24, left: 0, right: 0, bottom: 0 },
};

/** Monta [ui] con el tema de la app (como `MaterialApp(theme: viajeroLight/Dark)` en Flutter). */
export function renderConTema(ui: ReactElement, { modo = 'light' }: { modo?: ModoTema } = {}) {
  return render(
    <SafeAreaProvider initialMetrics={metricas}>
      <ThemeProvider modoInicial={modo}>{ui}</ThemeProvider>
    </SafeAreaProvider>,
  );
}

export const insetSuperiorDePrueba = metricas.insets.top;

/**
 * Íconos (decorativos, ocultos a lectores de pantalla): equivalente a `find.byIcon`. Devuelve el
 * tamaño y color que pinta el glifo.
 */
export function iconos(nombre: string) {
  return screen.queryAllByTestId(`icono-${nombre}`, { includeHiddenElements: true }).map((el) => {
    const s = StyleSheet.flatten(el.props.style) ?? {};
    return { el, size: s.fontSize as number, color: s.color as string };
  });
}

export function icono(nombre: string) {
  const todos = iconos(nombre);
  if (todos.length !== 1) throw new Error(`Se esperaba un ícono ${nombre} y hay ${todos.length}`);
  return todos[0];
}
