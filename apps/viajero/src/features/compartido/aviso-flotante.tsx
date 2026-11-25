import { useFocusEffect } from 'expo-router';
import { useCallback, useState, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/ui/components';
import { AppText, useTheme } from '@/ui/theme';

/**
 * `ScaffoldMessenger.showSnackBar` de Flutter: un aviso flotante (§3.7: `floating`, radio 14) que
 * vive a nivel de APP, no de pantalla. Por eso sobrevive a la navegación: la reseña dice «¡Gracias!»
 * y vuelve a «Mis reservas», que es donde se lee. Cada pantalla que muestra avisos pinta un
 * `<AvisoFlotante />`; solo lo pinta la que tiene el foco (las de debajo en la pila no lo duplican).
 * Dura lo que el SnackBar por defecto (4 s); uno nuevo reemplaza al anterior.
 */

export const DURACION_AVISO_MS = 4000;

interface Aviso {
  id: number;
  texto: string;
}

let actual: Aviso | null = null;
let siguienteId = 0;
let temporizador: ReturnType<typeof setTimeout> | null = null;
const oyentes = new Set<() => void>();

function avisar() {
  for (const oyente of [...oyentes]) oyente();
}

/** Muestra [texto] como aviso flotante (reemplaza el que hubiera). */
export function mostrarAviso(texto: string): void {
  actual = { id: ++siguienteId, texto };
  if (temporizador !== null) clearTimeout(temporizador);
  const id = actual.id;
  temporizador = setTimeout(() => ocultarAviso(id), DURACION_AVISO_MS);
  avisar();
}

/** Quita el aviso (solo el de [id] si se indica: uno viejo no borra a uno nuevo). */
export function ocultarAviso(id?: number): void {
  if (actual === null || (id !== undefined && actual.id !== id)) return;
  actual = null;
  if (temporizador !== null) clearTimeout(temporizador);
  temporizador = null;
  avisar();
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

const leer = () => actual;

/** El aviso vigente (para pruebas y para el anfitrión). */
export function useAvisoActual(): Aviso | null {
  return useSyncExternalStore(suscribir, leer, leer);
}

/**
 * Anfitrión del aviso en una pantalla. [sobreBarraInferior]: la pantalla vive dentro de las
 * pestañas (la barra inferior ya respeta la zona segura); si no, se deja el margen de la zona
 * segura de abajo.
 */
export function AvisoFlotante({ sobreBarraInferior = false }: { sobreBarraInferior?: boolean }) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const abajo = useSafeAreaInsets().bottom;
  const aviso = useAvisoActual();
  const [enfocada, setEnfocada] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setEnfocada(true);
      return () => setEnfocada(false);
    }, []),
  );

  if (!aviso || !enfocada) return null;
  return (
    <View
      pointerEvents="box-none"
      style={[estilos.capa, { bottom: 10 + (sobreBarraInferior ? 0 : abajo) }]}
    >
      <View
        testID="aviso-flotante"
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[estilos.aviso, { backgroundColor: cs.inverseSurface, borderRadius: tema.componentes.snackBar.radio }]}
      >
        <Text style={{ fontSize: AppText.cuerpo, color: cs.onInverseSurface }}>{aviso.texto}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  capa: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 15, alignItems: 'stretch' },
  aviso: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
