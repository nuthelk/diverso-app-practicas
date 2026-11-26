import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ButtonSpinner } from '@/features/shell/components/ButtonSpinner';
import { CircularProgressIndicator, FilledButton, Icon, Text, TextButton } from '@/ui/components';
import { AppInsets, AppRadii, AppText, useTheme } from '@/ui/theme';

import { ConsentCheckboxes } from '../components/ConsentCheckboxes';
import { ConsentState } from '../view-models/consent-view-model';
import { useConsent } from '../view-models/ConsentProvider';

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
  const theme = useTheme();
  const cs = theme.colorScheme;
  const consent = useConsent();
  const [acceptsDataPolicy, setAcceptsDataPolicy] = useState(false);
  const [acceptsTerms, setAcceptsTerms] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `PopScope(canPop: false)`: el botón atrás de Android no cierra esta pantalla.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => subscription.remove();
    }, []),
  );

  const handleAccept = async () => {
    setAttempted(true);
    if (!acceptsDataPolicy || !acceptsTerms) return;
    setSaving(true);
    setError(null);
    const saved = await consent.accept();
    setSaving(false);
    if (!saved) setError('No pudimos guardar tu autorización. Intenta de nuevo.');
  };

  let content;
  if (consent.state === ConsentState.error) {
    // No se pudo saber qué falta aceptar: no se deja pasar, se avisa y se ofrece reintentar.
    content = (
      <>
        <View style={[AppInsets.card, { backgroundColor: cs.errorContainer, borderRadius: AppRadii.field }]}>
          <Text height={1.4} style={{ color: cs.onErrorContainer, fontSize: AppText.smallBody }}>
            No pudimos verificar tu autorización. Revisa tu conexión e intenta de nuevo.
          </Text>
        </View>
        <View style={{ height: 16 }} />
        <FilledButton text="Reintentar" onPress={() => void consent.retry()} />
      </>
    );
  } else if (consent.state === ConsentState.checking && !saving) {
    content = (
      <View style={styles.center} testID="consent-checking">
        <CircularProgressIndicator />
      </View>
    );
  } else {
    content = (
      <>
        <ConsentCheckboxes
          acceptsDataPolicy={acceptsDataPolicy}
          acceptsTerms={acceptsTerms}
          showError={attempted}
          onDataPolicyChange={setAcceptsDataPolicy}
          onTermsChange={setAcceptsTerms}
        />
        {error !== null ? (
          <>
            <View style={{ height: 12 }} />
            <Text style={{ color: cs.error, fontSize: AppText.smallBody }}>{error}</Text>
          </>
        ) : null}
        <View style={{ height: 24 }} />
        <FilledButton accessibilityLabel="Aceptar y continuar" onPress={saving ? null : () => void handleAccept()}>
          {saving ? <ButtonSpinner /> : <Text>Aceptar y continuar</Text>}
        </FilledButton>
      </>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.pageBackground }]}>
      <View style={styles.center}>
        <ScrollView style={styles.column} contentContainerStyle={AppInsets.screen}>
          <View style={[AppInsets.card, styles.icon, { backgroundColor: cs.primaryContainer }]}>
            <Icon name="privacy_tip_rounded" size={28} color={cs.onPrimaryContainer} />
          </View>
          <View style={{ height: 18 }} />
          <Text style={{ fontSize: AppText.headingXl, fontWeight: '800', letterSpacing: -0.6 }}>Antes de continuar</Text>
          <View style={{ height: 8 }} />
          <Text height={1.5} style={{ fontSize: AppText.body, color: cs.onSurfaceVariant }}>
            Actualizamos nuestros documentos legales. Necesitamos tu autorización expresa para seguir gestionando tu cuenta y tus reservas.
          </Text>
          <View style={{ height: 20 }} />
          {content}
          <View style={{ height: 8 }} />
          <TextButton text="Cerrar sesión" onPress={saving ? null : () => void consent.signOut()} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  column: { width: '100%', maxWidth: 460, flexGrow: 0 },
  icon: { alignSelf: 'flex-start', borderRadius: 18 },
});
