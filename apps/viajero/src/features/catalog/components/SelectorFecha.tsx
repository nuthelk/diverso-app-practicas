import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { LONG_MONTH_NAMES, formatShortDate } from '@/core';
import { IconButton, Text, TextButton } from '@/ui/components';
import { AppText, withAlpha, useTheme } from '@/ui/theme';

const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const soloDia = (f: Date) => new Date(f.getFullYear(), f.getMonth(), f.getDate());
const mismoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * `showDatePicker` de Material (calendario en un diálogo): elige un día entre [primera] y
 * [ultima] (inclusive), arrancando en [inicial]. «Aceptar» devuelve el día (medianoche local);
 * «Cancelar» o tocar fuera, nada.
 */
export function SelectorFecha({
  visible,
  inicial,
  primera,
  ultima,
  onElegir,
  onCerrar,
}: {
  visible: boolean;
  inicial: Date;
  primera: Date;
  ultima: Date;
  onElegir: (fecha: Date) => void;
  onCerrar: () => void;
}) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const [elegida, setElegida] = useState(() => soloDia(inicial));
  const [mes, setMes] = useState(() => new Date(inicial.getFullYear(), inicial.getMonth(), 1));
  const desde = soloDia(primera);
  const hasta = soloDia(ultima);
  const hoy = soloDia(new Date());

  const diasDelMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const huecos = mes.getDay();
  const celdas: (Date | null)[] = [
    ...Array.from({ length: huecos }, () => null),
    ...Array.from({ length: diasDelMes }, (_, i) => new Date(mes.getFullYear(), mes.getMonth(), i + 1)),
  ];
  const puedeAtras = new Date(mes.getFullYear(), mes.getMonth(), 0) >= desde;
  const puedeAdelante = new Date(mes.getFullYear(), mes.getMonth() + 1, 1) <= hasta;
  const mover = (delta: number) => setMes(new Date(mes.getFullYear(), mes.getMonth() + delta, 1));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <Pressable accessibilityLabel="Cerrar" style={[estilos.scrim, { backgroundColor: 'rgba(0,0,0,0.54)' }]} onPress={onCerrar}>
        <Pressable testID="selector-fecha" style={[estilos.dialogo, { backgroundColor: cs.surfaceContainerHigh }]}>
          <View style={estilos.cabecera}>
            <Text style={{ fontSize: AppText.caption, fontWeight: '500', color: cs.onSurfaceVariant }}>Seleccionar fecha</Text>
            <Text style={{ fontSize: 32, fontWeight: '400', marginTop: 20, color: cs.onSurfaceVariant }} altura={1.25}>
              {formatShortDate(elegida)}
            </Text>
          </View>
          <View style={[estilos.divisor, { backgroundColor: cs.outlineVariant }]} />
          <View style={estilos.mes}>
            <Text style={{ flex: 1, fontSize: AppText.body, fontWeight: '600', color: cs.onSurfaceVariant }}>
              {`${LONG_MONTH_NAMES[mes.getMonth()]} de ${mes.getFullYear()}`}
            </Text>
            {/* Sin `chevron_left` en el mapa de íconos: el mismo glifo girado. */}
            <View style={estilos.girado}>
              <IconButton icono="chevron_right_rounded" tooltip="Mes anterior" onPress={puedeAtras ? () => mover(-1) : null} />
            </View>
            <IconButton icono="chevron_right_rounded" tooltip="Mes siguiente" onPress={puedeAdelante ? () => mover(1) : null} />
          </View>
          <View style={estilos.semana}>
            {DIAS.map((d, i) => (
              <Text key={i} style={[estilos.celdaTexto, { color: cs.onSurface, fontSize: AppText.caption }]}>
                {d}
              </Text>
            ))}
          </View>
          <View style={estilos.dias}>
            {celdas.map((dia, i) => {
              if (!dia) return <View key={`h${i}`} style={estilos.celda} />;
              const habilitado = dia >= desde && dia <= hasta;
              const sel = mismoDia(dia, elegida);
              const esHoy = mismoDia(dia, hoy);
              return (
                <Pressable
                  key={dia.getDate()}
                  disabled={!habilitado}
                  onPress={() => setElegida(dia)}
                  accessibilityRole="button"
                  accessibilityLabel={formatShortDate(dia)}
                  accessibilityState={{ disabled: !habilitado, selected: sel }}
                  style={estilos.celda}
                >
                  <View
                    style={[
                      estilos.circulo,
                      sel ? { backgroundColor: cs.primary } : esHoy ? { borderWidth: 1, borderColor: cs.primary } : null,
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: AppText.body,
                        color: sel ? cs.onPrimary : !habilitado ? withAlpha(cs.onSurface, 0.38) : esHoy ? cs.primary : cs.onSurface,
                      }}
                    >
                      {String(dia.getDate())}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View style={estilos.acciones}>
            <TextButton texto="Cancelar" onPress={onCerrar} style={estilos.intrinseco} />
            <TextButton texto="Aceptar" onPress={() => onElegir(elegida)} style={estilos.intrinseco} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialogo: { width: 328, maxWidth: '100%', borderRadius: 28, paddingBottom: 8, overflow: 'hidden' },
  cabecera: { paddingLeft: 24, paddingRight: 12, paddingTop: 16, paddingBottom: 12 },
  divisor: { height: 1 },
  mes: { flexDirection: 'row', alignItems: 'center', paddingLeft: 24, paddingRight: 8, paddingTop: 4 },
  girado: { transform: [{ rotate: '180deg' }] },
  semana: { flexDirection: 'row', paddingHorizontal: 12 },
  dias: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  celda: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' },
  celdaTexto: { width: `${100 / 7}%`, textAlign: 'center', paddingVertical: 8 },
  circulo: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  acciones: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, gap: 8 },
  intrinseco: { alignSelf: 'flex-end' },
});
