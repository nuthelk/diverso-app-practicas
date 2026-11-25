import { StyleSheet, View } from 'react-native';

import { noLineBreaks } from '@/core';
import { Icono, Text, type IconoNombre } from '@/ui/components';
import { AppText, useTheme } from '@/ui/theme';

/**
 * Fila de dato con ícono (`FilaDato`): «📅 lun 27 oct · 06:00 · en 3 días». [acento] va al final,
 * en w700 primary. El texto se parte en varias líneas antes que desbordar. [color] tiñe texto e
 * ícono (por defecto, el del texto y onSurfaceVariant).
 */
export function FilaDato({
  icono,
  texto,
  acento,
  color,
  compacto = false,
}: {
  icono: IconoNombre;
  texto: string;
  acento?: string | null;
  color?: string;
  compacto?: boolean;
}) {
  const cs = useTheme().colorScheme;
  const estiloAcento = { fontWeight: '700' as const, color: cs.primary };
  return (
    <View style={estilos.fila}>
      <View style={estilos.icono}>
        <Icono nombre={icono} size={compacto ? 16 : 19} color={color ?? cs.onSurfaceVariant} />
      </View>
      <View style={{ width: compacto ? 8 : 10 }} />
      <Text
        altura={1.3}
        style={[estilos.texto, { fontSize: compacto ? AppText.detalle : AppText.cuerpoGrande, color: color ?? cs.onSurface }]}
      >
        {noLineBreaks(texto)}
        {acento ? (
          <>
            <Text style={estiloAcento}>{' · '}</Text>
            <Text style={estiloAcento}>{acento}</Text>
          </>
        ) : null}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'flex-start' },
  icono: { paddingTop: 1 },
  texto: { flex: 1 },
});
