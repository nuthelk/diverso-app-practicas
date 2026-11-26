import { useRouter } from 'expo-router';
import { Fragment } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { LegalDocument, LEGAL_VERSION } from '@/core';
import { TopBar } from '@/features/shell/components/TopBar';
import { AppRoutes, safeGoBack } from '@/router';
import { Text } from '@/ui/components';
import { AppInsets, AppRadii, AppText, withAlpha, useTheme } from '@/ui/theme';

/**
 * Lectura de un documento legal (`/legal/[doc]`: política de datos o términos). Accesible siempre,
 * con o sin sesión: se abre desde el registro antes de aceptar y desde el consentimiento. El texto
 * es seleccionable (`SelectionArea`) y los títulos de sección son encabezados semánticos. El botón
 * atrás solo aparece si hay historial (como el automático del `AppBar`).
 */
export function LegalView({ docId }: { docId: string }) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const router = useRouter();
  const doc = LegalDocument.byId(docId);

  return (
    <View style={[styles.screen, { backgroundColor: theme.pageBackground }]}>
      <TopBar title="Documentos legales" onBack={() => safeGoBack(router, AppRoutes.explore)} />
      {doc === null ? (
        <View style={styles.center}>
          <Text>Documento no encontrado.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <Text selectable style={{ fontSize: AppText.note, fontWeight: '700', letterSpacing: 1.2, color: cs.outline }}>
            {`VERSIÓN ${LEGAL_VERSION.toUpperCase()}`}
          </Text>
          <View style={{ height: 8 }} />
          <Text selectable height={1.2} style={{ fontSize: AppText.heading2xl, fontWeight: '800', letterSpacing: -0.6 }}>
            {doc.title}
          </Text>
          <View style={{ height: 8 }} />
          <Text selectable height={1.5} style={{ fontSize: AppText.emphasis, color: cs.onSurfaceVariant }}>
            {doc.summary}
          </Text>
          <View style={{ height: 18 }} />
          <View
            style={[
              AppInsets.card,
              { backgroundColor: withAlpha(cs.tertiaryContainer, 0.55), borderRadius: AppRadii.field },
            ]}
          >
            <Text selectable height={1.5} style={{ fontSize: AppText.largeCaption, color: cs.onTertiaryContainer }}>
              Borrador para el piloto académico: debe revisarlo un abogado y completarse con los datos del responsable antes del lanzamiento comercial.
            </Text>
          </View>
          {doc.sections.map((s) => (
            <Fragment key={s.title}>
              <View style={{ height: 26 }} />
              <Text selectable accessibilityRole="header" style={{ fontSize: AppText.subtitle, fontWeight: '700' }}>
                {s.title}
              </Text>
              {s.paragraphs.map((p) => (
                <Fragment key={p}>
                  <View style={{ height: 10 }} />
                  <Text selectable height={1.65} style={{ fontSize: AppText.largeBody, color: cs.onSurface }}>
                    {p}
                  </Text>
                </Fragment>
              ))}
            </Fragment>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingLeft: 22, paddingTop: 8, paddingRight: 22, paddingBottom: 48 },
});
