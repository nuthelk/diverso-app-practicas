import { useFocusEffect } from 'expo-router';
import { useCallback, useState, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { noLineBreaks } from '@/core';
import { Text } from '@/ui/components';
import { AppText, useTheme } from '@/ui/theme';

/**
 * `ScaffoldMessenger.showSnackBar` de Flutter: un aviso flotante (§3.7: `floating`, radio 14) que
 * vive a nivel de APP, no de pantalla. Por eso sobrevive a la navegación: la reseña dice «¡Gracias!»
 * y vuelve a «Mis reservas», que es donde se lee. Cada pantalla que muestra avisos pinta un
 * `<Snackbar />`; solo lo pinta la que tiene el foco (las de debajo en la pila no lo duplican).
 * Dura lo que el SnackBar por defecto (4 s); uno nuevo reemplaza al anterior.
 */

export const SNACKBAR_DURATION_MS = 4000;

interface SnackbarMessage {
  id: number;
  text: string;
}

let current: SnackbarMessage | null = null;
let nextId = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of [...listeners]) listener();
}

/** Muestra [texto] como aviso flotante (reemplaza el que hubiera). */
export function showSnackbar(text: string): void {
  current = { id: ++nextId, text };
  if (timer !== null) clearTimeout(timer);
  const id = current.id;
  timer = setTimeout(() => hideSnackbar(id), SNACKBAR_DURATION_MS);
  notify();
}

/** Quita el aviso (solo el de [id] si se indica: uno viejo no borra a uno nuevo). */
export function hideSnackbar(id?: number): void {
  if (current === null || (id !== undefined && current.id !== id)) return;
  current = null;
  if (timer !== null) clearTimeout(timer);
  timer = null;
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const read = () => current;

/** El aviso vigente (para pruebas y para el anfitrión). */
export function useCurrentSnackbar(): SnackbarMessage | null {
  return useSyncExternalStore(subscribe, read, read);
}

/**
 * Anfitrión del aviso en una pantalla. [aboveBottomBar]: la pantalla vive dentro de las
 * pestañas (la barra inferior ya respeta la zona segura); si no, se deja el margen de la zona
 * segura de abajo.
 */
export function Snackbar({ aboveBottomBar = false }: { aboveBottomBar?: boolean }) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const bottom = useSafeAreaInsets().bottom;
  const snackbar = useCurrentSnackbar();
  const [focused, setFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  if (!snackbar || !focused) return null;
  return (
    <View
      pointerEvents="box-none"
      style={[styles.layer, { bottom: 10 + (aboveBottomBar ? 0 : bottom) }]}
    >
      <View
        testID="snackbar"
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[styles.snackbar, { backgroundColor: cs.inverseSurface, borderRadius: theme.components.snackBar.radius }]}
      >
        <Text style={{ fontSize: AppText.body, color: cs.onInverseSurface }}>{noLineBreaks(snackbar.text)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 15, alignItems: 'stretch' },
  snackbar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
