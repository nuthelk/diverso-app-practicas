import { StyleSheet, View } from 'react-native';

import { IconButton, SectionLabel, Text } from '@/ui/components';
import { AppRadios, AppText, useTheme } from '@/ui/theme';

const LADO = 38;

/**
 * «¿Cuántos viajan?»: botones − / + con el número de personas y los cupos de la fecha. Qué botones
 * se habilitan lo decide el view model (`puedeQuitar` / `puedeAgregar`).
 */
export function SelectorPersonas({
  pax,
  cupos,
  puedeQuitar,
  puedeAgregar,
  onCambiar,
}: {
  pax: number;
  cupos: number;
  puedeQuitar: boolean;
  puedeAgregar: boolean;
  onCambiar: (valor: number) => void;
}) {
  const cs = useTheme().colorScheme;
  return (
    <View>
      <SectionLabel texto="Personas" />
      <View style={[estilos.caja, { backgroundColor: cs.surfaceContainerLow }]}>
        <View style={estilos.pregunta}>
          <Text style={{ fontWeight: '600' }}>¿Cuántos viajan?</Text>
        </View>
        <BotonPersonas quitar habilitado={puedeQuitar} onTap={() => onCambiar(pax - 1)} />
        <View style={estilos.numero}>
          <Text style={{ fontSize: AppText.encabezadoXs, fontWeight: '800', textAlign: 'center' }}>{String(pax)}</Text>
        </View>
        <BotonPersonas habilitado={puedeAgregar} onTap={() => onCambiar(pax + 1)} />
      </View>
      <View style={{ height: 6 }} />
      <Text style={{ fontSize: AppText.leyenda, color: cs.onSurfaceVariant }}>
        {`${cupos} cupos disponibles para esta fecha`}
      </Text>
    </View>
  );
}

/** `IconButton.outlined` 38×38: borde e ícono primary si está habilitado; si no, outlineVariant/outline. */
function BotonPersonas({ quitar = false, habilitado, onTap }: { quitar?: boolean; habilitado: boolean; onTap: () => void }) {
  const cs = useTheme().colorScheme;
  return (
    <IconButton
      variante="outlined"
      icono={quitar ? 'remove_rounded' : 'add_rounded'}
      tooltip={quitar ? 'Quitar una persona' : 'Agregar una persona'}
      tamanoIcono={18}
      colorIcono={habilitado ? cs.primary : cs.outline}
      onPress={habilitado ? onTap : null}
      style={[estilos.boton, { borderColor: habilitado ? cs.primary : cs.outlineVariant }]}
    />
  );
}

const estilos = StyleSheet.create({
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: AppRadios.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pregunta: { flex: 1, minWidth: 0 },
  numero: { width: 52 },
  // `minimumSize`/`maximumSize` 38 de Flutter; el área táctil «padded» de 48 ocupa 5 a cada lado.
  boton: { width: LADO, height: LADO, borderRadius: LADO / 2, margin: 5 },
});
