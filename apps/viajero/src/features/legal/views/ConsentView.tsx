import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ButtonSpinner } from '@/features/shell/components/ButtonSpinner';
import { CircularProgressIndicator, FilledButton, Icon, Text, TextButton } from '@/ui/components';
import { AppInsets, AppRadii, AppText, useTheme } from '@/ui/theme';

import { ConsentCheckboxes } from '../components/ConsentCheckboxes';
import { EstadoConsentimiento } from '../view-models/consent-view-model';
import { useConsentimiento } from '../view-models/ConsentimientoProvider';

/**
 * Pide la autorización vigente a cuentas que no la tienen (creadas antes de la versión actual o
 * tras un cambio de los documentos). No se puede salir sin aceptar (ni con el botón atrás de
 * Android ni con el gesto de iOS: ver `gestureEnabled: false` en la tabla de rutas); la
 * alternativa es cerrar sesión.
 *
 * Es el destino del guard por consentimiento: si no se pudo verificar qué falta aceptar, muestra
 * un aviso con «Reintentar» en vez de dejar pasar. Al aceptar, el guard saca al usuario de aquí.
 */
export function ConsentView() {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const consentimiento = useConsentimiento();
  const [datos, setDatos] = useState(false);
  const [terminos, setTerminos] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `PopScope(canPop: false)`: el botón atrás de Android no cierra esta pantalla.
  useFocusEffect(
    useCallback(() => {
      const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => suscripcion.remove();
    }, []),
  );

  const aceptar = async () => {
    setIntentado(true);
    if (!datos || !terminos) return;
    setGuardando(true);
    setError(null);
    const guardado = await consentimiento.aceptar();
    setGuardando(false);
    if (!guardado) setError('No pudimos guardar tu autorización. Intenta de nuevo.');
  };

  let contenido;
  if (consentimiento.estado === EstadoConsentimiento.error) {
    // No se pudo saber qué falta aceptar: no se deja pasar, se avisa y se ofrece reintentar.
    contenido = (
      <>
        <View style={[AppInsets.card, { backgroundColor: cs.errorContainer, borderRadius: AppRadii.field }]}>
          <Text height={1.4} style={{ color: cs.onErrorContainer, fontSize: AppText.smallBody }}>
            No pudimos verificar tu autorización. Revisa tu conexión e intenta de nuevo.
          </Text>
        </View>
        <View style={{ height: 16 }} />
        <FilledButton text="Reintentar" onPress={() => void consentimiento.reintentar()} />
      </>
    );
  } else if (consentimiento.estado === EstadoConsentimiento.verificando && !guardando) {
    contenido = (
      <View style={estilos.centro} testID="consentimiento-verificando">
        <CircularProgressIndicator />
      </View>
    );
  } else {
    contenido = (
      <>
        <ConsentCheckboxes
          aceptaDatos={datos}
          aceptaTerminos={terminos}
          mostrarError={intentado}
          onDatos={setDatos}
          onTerminos={setTerminos}
        />
        {error !== null ? (
          <>
            <View style={{ height: 12 }} />
            <Text style={{ color: cs.error, fontSize: AppText.smallBody }}>{error}</Text>
          </>
        ) : null}
        <View style={{ height: 24 }} />
        <FilledButton accessibilityLabel="Aceptar y continuar" onPress={guardando ? null : () => void aceptar()}>
          {guardando ? <ButtonSpinner /> : <Text>Aceptar y continuar</Text>}
        </FilledButton>
      </>
    );
  }

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: tema.pageBackground }]}>
      <View style={estilos.centro}>
        <ScrollView style={estilos.ancho} contentContainerStyle={AppInsets.screen}>
          <View style={[AppInsets.card, estilos.icono, { backgroundColor: cs.primaryContainer }]}>
            <Icon name="privacy_tip_rounded" size={28} color={cs.onPrimaryContainer} />
          </View>
          <View style={{ height: 18 }} />
          <Text style={{ fontSize: AppText.headingXl, fontWeight: '800', letterSpacing: -0.6 }}>Antes de continuar</Text>
          <View style={{ height: 8 }} />
          <Text height={1.5} style={{ fontSize: AppText.body, color: cs.onSurfaceVariant }}>
            Actualizamos nuestros documentos legales. Necesitamos tu autorización expresa para seguir gestionando tu cuenta y tus reservas.
          </Text>
          <View style={{ height: 20 }} />
          {contenido}
          <View style={{ height: 8 }} />
          <TextButton text="Cerrar sesión" onPress={guardando ? null : () => void consentimiento.cerrarSesion()} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ancho: { width: '100%', maxWidth: 460, flexGrow: 0 },
  icono: { alignSelf: 'flex-start', borderRadius: 18 },
});
