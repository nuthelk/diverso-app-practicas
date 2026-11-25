import { useRouter, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppRoutes } from '@/router';
import { Icono, Text } from '@/ui/components';
import { AppText, withAlpha, useTheme } from '@/ui/theme';

/** Área táctil de la casilla (M3: 48): el texto de cada fila, y el aviso, empiezan después. */
const AREA_CASILLA = 48;

/**
 * Casilla de M3 (`Checkbox`): caja 18 × 18, borde 2 y radio 2 en un área táctil de 48; marcada,
 * rellena de primary con ✓ onPrimary; con `isError`, en color error. Solo dibuja: el toque lo
 * maneja la fila entera.
 */
function Casilla({ valor, error }: { valor: boolean; error: boolean }) {
  const cs = useTheme().colorScheme;
  const color = error ? cs.error : valor ? cs.primary : cs.onSurfaceVariant;
  return (
    <View style={estilos.areaCasilla}>
      <View
        testID="casilla"
        style={[
          estilos.caja,
          { borderColor: color, backgroundColor: valor ? (error ? cs.error : cs.primary) : 'transparent' },
        ]}
      >
        {valor ? <Icono nombre="check_rounded" size={16} color={error ? cs.onError : cs.onPrimary} /> : null}
      </View>
    </View>
  );
}

/** Una fila: casilla + texto tocable; para lectores de pantalla es UNA casilla (`MergeSemantics`). */
function Fila({
  valor,
  onChanged,
  error,
  etiqueta,
  children,
}: {
  valor: boolean;
  onChanged: (valor: boolean) => void;
  error: boolean;
  etiqueta: string;
  children: ReactNode;
}) {
  const cs = useTheme().colorScheme;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: valor }}
      accessibilityLabel={etiqueta}
      onPress={() => onChanged(!valor)}
      style={estilos.fila}
    >
      <Casilla valor={valor} error={error} />
      <View style={estilos.texto}>
        <Text altura={1.45} style={{ fontSize: AppText.detail, color: cs.onSurfaceVariant }}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Casillas de autorización expresa (Ley 1581 de 2012), compartidas por el registro y la
 * pantalla de consentimiento. Nunca vienen marcadas: el titular debe aceptarlas de forma activa.
 * Los enlaces abren el documento sin alternar la casilla.
 */
export function ConsentCheckboxes({
  aceptaDatos,
  aceptaTerminos,
  onDatos,
  onTerminos,
  mostrarError = false,
}: {
  aceptaDatos: boolean;
  aceptaTerminos: boolean;
  onDatos: (valor: boolean) => void;
  onTerminos: (valor: boolean) => void;
  /** Resalta las casillas pendientes tras un intento de envío. */
  mostrarError?: boolean;
}) {
  const cs = useTheme().colorScheme;
  const router = useRouter();

  const enlace = (texto: string, ruta: string) => (
    <Text
      accessibilityRole="link"
      onPress={() => router.push(ruta as Href)}
      style={{
        color: cs.primary,
        fontWeight: '700',
        textDecorationLine: 'underline',
        textDecorationColor: withAlpha(cs.primary, 0.5),
      }}
    >
      {texto}
    </Text>
  );

  return (
    <View>
      <Fila
        valor={aceptaDatos}
        onChanged={onDatos}
        error={mostrarError && !aceptaDatos}
        etiqueta="Autorizo de manera previa, expresa e informada el tratamiento de mis datos personales según la política de tratamiento de datos (Ley 1581 de 2012)."
      >
        Autorizo de manera previa, expresa e informada el tratamiento de mis datos personales según la{' '}
        {enlace('política de tratamiento de datos', AppRoutes.legal('privacidad'))} (Ley 1581 de 2012).
      </Fila>
      <View style={{ height: 4 }} />
      <Fila
        valor={aceptaTerminos}
        onChanged={onTerminos}
        error={mostrarError && !aceptaTerminos}
        etiqueta="Acepto los términos y condiciones."
      >
        Acepto los {enlace('términos y condiciones', AppRoutes.legal('terminos-viajeros'))}.
      </Fila>
      {mostrarError && (!aceptaDatos || !aceptaTerminos) ? (
        <Text style={[estilos.aviso, { fontSize: AppText.largeCaption, color: cs.error }]}>
          Debes aceptar ambos documentos para crear tu cuenta.
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'flex-start' },
  areaCasilla: { width: AREA_CASILLA, height: AREA_CASILLA, alignItems: 'center', justifyContent: 'center' },
  caja: { width: 18, height: 18, borderRadius: 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  texto: { flex: 1, paddingTop: 12 },
  // Alineado con el texto de las casillas, no con la casilla.
  aviso: { paddingLeft: AREA_CASILLA, paddingTop: 4 },
});
