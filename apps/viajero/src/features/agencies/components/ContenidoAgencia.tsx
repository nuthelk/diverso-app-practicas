import { useState } from 'react';
import { RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';

import type { AgencySummary, Plan } from '@/core';
import { Grid } from '@/features/catalog/components/Grid';
import { PlanCard } from '@/features/catalog/components/PlanCard';
import { AgencyAvatar, CollapsibleHeader, pageTitleStyle, SectionLabel, Text, VerifiedBadge } from '@/ui/components';
import { AppInsets, AppText, AppTheme, useTheme } from '@/ui/theme';

import { DatosAgencia, PortadaAgencia } from './AgenciaCard';

/**
 * El cuerpo de la página de una agencia cargada (`contenido_agencia.dart`): cabecera colapsable
 * con la portada, logo, nombre, datos, sello, descripción y sus planes (sin botón de comparar).
 */
export function ContenidoAgencia({
  agencia,
  planes,
  onRefresh,
  onVolver,
}: {
  agencia: AgencySummary;
  planes: readonly Plan[];
  onRefresh: () => Promise<void>;
  onVolver: () => void;
}) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const { width } = useWindowDimensions();
  const esGrid = width > AppTheme.bpCompact;
  const [refrescando, setRefrescando] = useState(false);
  const descripcion = agencia.description.trim();

  const refrescar = async () => {
    setRefrescando(true);
    try {
      await onRefresh();
    } finally {
      setRefrescando(false);
    }
  };

  return (
    <CollapsibleHeader
      title={agencia.name}
      expandedHeight={220}
      onBack={onVolver}
      background={<PortadaAgencia agencia={agencia} />}
      scrollViewProps={{
        refreshControl: <RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[cs.primary]} tintColor={cs.primary} />,
        alwaysBounceVertical: true,
      }}
    >
      <View style={estilos.bloque}>
        <View style={estilos.fila}>
          <AgencyAvatar agency={agencia} size={64} />
          <View style={{ width: 14 }} />
          <View style={estilos.flex}>
            <Text height={1.1} accessibilityRole="header" style={[pageTitleStyle(cs), { fontSize: AppText.headingXl }]}>
              {agencia.name}
            </Text>
            <View style={{ height: 8 }} />
            <DatosAgencia agencia={agencia} />
          </View>
        </View>
        <View style={{ height: 14 }} />
        <View style={estilos.inicio}>
          <VerifiedBadge />
        </View>
        {descripcion !== '' ? (
          <>
            <View style={{ height: 16 }} />
            <Text height={1.5} style={{ fontSize: AppText.largeBody, color: cs.onSurfaceVariant }}>
              {descripcion}
            </Text>
          </>
        ) : null}
        <View style={{ height: 28 }} />
        <SectionLabel text={`Planes publicados (${planes.length})`} />
      </View>
      {planes.length === 0 ? (
        <View style={estilos.vacio}>
          <Text>Esta agencia no tiene planes disponibles por ahora.</Text>
        </View>
      ) : (
        <View style={AppInsets.list}>
          {esGrid ? (
            <Grid
              items={planes}
              usableWidth={width - 40}
              keyOf={(p) => p.id}
              render={(p) => <PlanCard plan={p} />}
            />
          ) : (
            planes.map((p) => (
              <View key={p.id} style={AppInsets.betweenCards}>
                <PlanCard plan={p} />
              </View>
            ))
          )}
        </View>
      )}
    </CollapsibleHeader>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  fila: { flexDirection: 'row', alignItems: 'flex-start' },
  inicio: { alignItems: 'flex-start' },
  bloque: { paddingLeft: 22, paddingTop: 20, paddingRight: 22, paddingBottom: 8 },
  vacio: { paddingLeft: 22, paddingTop: 8, paddingRight: 22, paddingBottom: 32 },
});
