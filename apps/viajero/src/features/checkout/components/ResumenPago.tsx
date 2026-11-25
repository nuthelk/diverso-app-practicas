import { StyleSheet, View } from 'react-native';

import { formatCOP } from '@/core';
import { Divider, Icono, SectionLabel, Text } from '@/ui/components';
import { AppInsets, AppRadios, AppText, useTheme } from '@/ui/theme';

/** «Resumen» del checkout: precio por persona, personas y total a pagar. */
export function ResumenPago({ precioPorPersona, pax, total }: { precioPorPersona: number; pax: number; total: number }) {
  const cs = useTheme().colorScheme;
  return (
    <View>
      <SectionLabel texto="Resumen" />
      <View style={[AppInsets.tarjetaAmplia, estilos.caja, { backgroundColor: cs.surfaceContainerLow }]}>
        <LineaPago etiqueta="Precio por persona" valor={formatCOP(precioPorPersona)} />
        <LineaPago etiqueta="Personas" valor={String(pax)} />
        <View style={{ paddingVertical: 8 }}>
          <Divider />
        </View>
        <View style={estilos.extremos}>
          <Text style={{ fontWeight: '700', fontSize: AppText.enfasis }}>Total a pagar</Text>
          <Text style={{ fontSize: AppText.encabezadoXs, fontWeight: '800', letterSpacing: -0.4, color: cs.primary }}>
            {formatCOP(total)}
          </Text>
        </View>
        <View style={{ height: 6 }} />
        <View style={estilos.fila}>
          <Icono nombre="lock_outline_rounded" size={12} color={cs.outline} />
          <View style={{ width: 5 }} />
          <Text style={{ fontSize: AppText.etiqueta, color: cs.outline }}>Precio final, sin cargos ocultos</Text>
        </View>
      </View>
    </View>
  );
}

function LineaPago({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const cs = useTheme().colorScheme;
  return (
    <View style={[estilos.extremos, { paddingVertical: 3 }]}>
      <Text style={{ fontSize: AppText.cuerpoChico, color: cs.onSurfaceVariant }}>{etiqueta}</Text>
      <Text style={{ fontWeight: '600', fontSize: AppText.cuerpoChico }}>{valor}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { borderRadius: AppRadios.card },
  extremos: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fila: { flexDirection: 'row', alignItems: 'center' },
});
