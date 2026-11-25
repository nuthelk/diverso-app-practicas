import { useRouter } from 'expo-router';
import { Fragment } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { LegalDocument, LEGAL_VERSION } from '@/core';
import { BarraSuperior } from '@/features/shell/components/BarraSuperior';
import { AppRoutes, volverSeguro } from '@/router';
import { Text } from '@/ui/components';
import { AppInsets, AppRadios, AppText, conAlfa, useTheme } from '@/ui/theme';

/**
 * Lectura de un documento legal (`/legal/[doc]`: política de datos o términos). Accesible siempre,
 * con o sin sesión: se abre desde el registro antes de aceptar y desde el consentimiento. El texto
 * es seleccionable (`SelectionArea`) y los títulos de sección son encabezados semánticos. El botón
 * atrás solo aparece si hay historial (como el automático del `AppBar`).
 */
export function LegalView({ docId }: { docId: string }) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const router = useRouter();
  const doc = LegalDocument.byId(docId);

  return (
    <View style={[estilos.pantalla, { backgroundColor: tema.fondoPagina }]}>
      <BarraSuperior titulo="Documentos legales" onVolver={() => volverSeguro(router, AppRoutes.explorar)} />
      {doc === null ? (
        <View style={estilos.centro}>
          <Text>Documento no encontrado.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={estilos.lista}>
          <Text selectable style={{ fontSize: AppText.nota, fontWeight: '700', letterSpacing: 1.2, color: cs.outline }}>
            {`VERSIÓN ${LEGAL_VERSION.toUpperCase()}`}
          </Text>
          <View style={{ height: 8 }} />
          <Text selectable altura={1.2} style={{ fontSize: AppText.encabezado2xl, fontWeight: '800', letterSpacing: -0.6 }}>
            {doc.title}
          </Text>
          <View style={{ height: 8 }} />
          <Text selectable altura={1.5} style={{ fontSize: AppText.enfasis, color: cs.onSurfaceVariant }}>
            {doc.summary}
          </Text>
          <View style={{ height: 18 }} />
          <View
            style={[
              AppInsets.tarjeta,
              { backgroundColor: conAlfa(cs.tertiaryContainer, 0.55), borderRadius: AppRadios.field },
            ]}
          >
            <Text selectable altura={1.5} style={{ fontSize: AppText.leyendaGrande, color: cs.onTertiaryContainer }}>
              Borrador para el piloto académico: debe revisarlo un abogado y completarse con los datos del responsable antes del lanzamiento comercial.
            </Text>
          </View>
          {doc.sections.map((s) => (
            <Fragment key={s.title}>
              <View style={{ height: 26 }} />
              <Text selectable accessibilityRole="header" style={{ fontSize: AppText.subtitulo, fontWeight: '700' }}>
                {s.title}
              </Text>
              {s.paragraphs.map((p) => (
                <Fragment key={p}>
                  <View style={{ height: 10 }} />
                  <Text selectable altura={1.65} style={{ fontSize: AppText.cuerpoGrande, color: cs.onSurface }}>
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

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lista: { paddingLeft: 22, paddingTop: 8, paddingRight: 22, paddingBottom: 48 },
});
