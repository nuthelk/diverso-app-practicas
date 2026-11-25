import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatCOP, formatShortDate } from '@/core';
import { FilledButton, Icon, IconButton, OutlinedButton, SectionLabel, Text, TextField } from '@/ui/components';
import { AppRadii, AppText, withAlpha, useTheme } from '@/ui/theme';

import { DeslizadorPrecio } from './DeslizadorPrecio';
import { SelectorFecha } from './SelectorFecha';

/** Límites del precio máximo por persona (COP). En [PRECIO_MAXIMO] el filtro queda sin límite. */
export const PRECIO_MINIMO = 50000;
export const PRECIO_MAXIMO = 600000;
export const DIVISIONES_PRECIO = 11;

const DIA_MS = 24 * 60 * 60 * 1000;

/** Lo que la hoja lee del view model del catálogo y el comando que llama al aplicar. */
export interface FiltrosDelCatalogo {
  destino: string | null;
  precioMax: number | null;
  fecha: Date | null;
  destinos: readonly string[];
  aplicarFiltros: (f: { destino?: string | null; precioMax?: number | null; fecha?: Date | null }) => Promise<void>;
}

/**
 * Hoja de filtros (`filtros_sheet.dart`): fecha, precio máximo y destino. Su estado es local
 * (parte de los filtros activos, para que cambiar solo el precio no borre el destino) y «Aplicar
 * filtros» cierra la hoja y los envía juntos con UNA consulta. «Limpiar» solo limpia la hoja.
 *
 * Android edge-to-edge (SDK 58): el Modal dibuja bajo las barras del sistema
 * (`statusBarTranslucent` + `navigationBarTranslucent`) y la hoja llega al borde inferior real; el
 * inset inferior es relleno del pie «Limpiar / Aplicar filtros», FIJO fuera del scroll. Con
 * teclado sube con `behavior="padding"` en ambas plataformas: la ventana no se achica sola.
 */
export function FiltrosSheet({ visible, vm, onCerrar }: { visible: boolean; vm: FiltrosDelCatalogo; onCerrar: () => void }) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const abajo = useSafeAreaInsets().bottom;
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={onCerrar}>
      <KeyboardAvoidingView testID="filtros-teclado" behavior="padding" style={estilos.raiz}>
        <Pressable accessibilityLabel="Cerrar" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.32)' }]} onPress={onCerrar} />
        <View testID="filtros-sheet" style={[estilos.hoja, { backgroundColor: cs.surfaceContainerLow }]}>
          {/* showDragHandle: 32 × 4, onSurfaceVariant al 40 %, 22 de aire arriba y abajo. */}
          <View style={estilos.asa}>
            <View style={[estilos.asaBarra, { backgroundColor: withAlpha(cs.onSurfaceVariant, 0.4) }]} />
          </View>
          {visible ? <ContenidoFiltros vm={vm} onCerrar={onCerrar} abajo={abajo} /> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ContenidoFiltros({ vm, onCerrar, abajo }: { vm: FiltrosDelCatalogo; onCerrar: () => void; abajo: number }) {
  const cs = useTheme().colorScheme;
  const [precio, setPrecio] = useState<number | null>(vm.precioMax);
  const [fecha, setFecha] = useState<Date | null>(vm.fecha);
  const [destino, setDestino] = useState<string>(vm.destino ?? '');
  const [busqueda, setBusqueda] = useState('');
  const [eligiendoFecha, setEligiendoFecha] = useState(false);

  const filtro = busqueda.trim().toLowerCase();
  const opciones = ['Todos los destinos', ...vm.destinos.filter((d) => d.toLowerCase().includes(filtro))];

  const limpiar = () => {
    setFecha(null);
    setPrecio(null);
    setDestino('');
    setBusqueda('');
  };
  const aplicar = () => {
    onCerrar();
    void vm.aplicarFiltros({ destino: destino === '' ? null : destino, precioMax: precio, fecha });
  };

  const ahora = new Date();
  return (
    <>
      <ScrollView testID="filtros-scroll" keyboardShouldPersistTaps="handled" style={estilos.scroll} contentContainerStyle={estilos.contenido}>
        <Text style={{ fontSize: AppText.headingL, fontWeight: '800', letterSpacing: -0.5 }}>Filtros</Text>
        <View style={{ height: 22 }} />
        <SectionLabel text="Fecha del plan" />
        <View style={estilos.fila}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={fecha === null ? 'Cualquier fecha' : formatShortDate(fecha)}
            onPress={() => setEligiendoFecha(true)}
            style={[estilos.opcionFecha, { backgroundColor: cs.surfaceContainerHigh }]}
          >
            <Icon name="calendar_month_rounded" size={19} color={cs.primary} />
            <Text style={{ marginLeft: 10, fontWeight: '600', fontSize: AppText.body }}>
              {fecha === null ? 'Cualquier fecha' : formatShortDate(fecha)}
            </Text>
          </Pressable>
          {fecha !== null ? (
            <>
              <View style={{ width: 8 }} />
              <IconButton variant="outlined" icon="close_rounded" iconSize={18} tooltip="Quitar fecha" onPress={() => setFecha(null)} />
            </>
          ) : null}
        </View>
        <View style={{ height: 20 }} />
        <SectionLabel text="Precio máximo por persona" />
        <View style={estilos.fila}>
          <View style={estilos.flex}>
            <DeslizadorPrecio
              accessibilityLabel="Precio máximo por persona"
              valor={Math.min(Math.max(precio ?? PRECIO_MAXIMO, PRECIO_MINIMO), PRECIO_MAXIMO)}
              min={PRECIO_MINIMO}
              max={PRECIO_MAXIMO}
              divisiones={DIVISIONES_PRECIO}
              etiqueta={formatCOP}
              onCambio={(v) => setPrecio(v >= PRECIO_MAXIMO ? null : v)}
            />
          </View>
          <Text
            testID="valor-precio"
            style={{ width: 110, textAlign: 'right', fontWeight: '700', fontSize: AppText.smallBody }}
          >
            {precio === null || precio === 0 ? 'Sin límite' : formatCOP(precio)}
          </Text>
        </View>
        <View style={{ height: 20 }} />
        {/* Buscador + lista propia (el menú desplegable dentro de la hoja no recibía los gestos). La
            lista NO es un scroll anidado: con uno propio, el gesto sobre los destinos solo movía esa
            lista y no la hoja. */}
        <SectionLabel text="Destino" />
        <TextField
          value={busqueda}
          onChangeText={setBusqueda}
          hint="Buscar destino…"
          icon="search_rounded"
          returnKeyType="search"
          testID="buscar-destino"
        />
        <View style={{ height: 8 }} />
        {opciones.map((d, i) => {
          const esTodos = i === 0;
          const sel = destino === (esTodos ? '' : d);
          return (
            <Pressable
              key={d}
              testID={esTodos ? 'destino-todos' : `destino-${d}`}
              accessibilityRole="button"
              accessibilityLabel={d}
              accessibilityState={{ selected: sel }}
              onPress={() => setDestino(esTodos ? '' : d)}
              style={({ pressed }) => [estilos.destino, pressed ? { backgroundColor: withAlpha(cs.onSurface, 0.1) } : null]}
            >
              <Icon
                name={esTodos ? 'travel_explore_outlined' : sel ? 'check_circle_rounded' : 'location_on_outlined'}
                size={19}
                color={sel ? cs.primary : cs.onSurfaceVariant}
              />
              <Text
                numberOfLines={1}
                style={{
                  marginLeft: 16,
                  flex: 1,
                  fontSize: AppText.body,
                  fontWeight: sel ? '700' : '500',
                  color: sel ? cs.primary : cs.onSurface,
                }}
              >
                {d}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {/* Pie fijo: siempre visible por larga que sea la lista; el inset inferior es su relleno. */}
      <View testID="filtros-pie" style={[estilos.pie, { paddingBottom: 16 + abajo, borderTopColor: withAlpha(cs.outlineVariant, 0.5) }]}>
        <OutlinedButton text="Limpiar" onPress={limpiar} style={estilos.flex} />
        <View style={{ width: 12 }} />
        <FilledButton icon="check_rounded" text="Aplicar filtros" onPress={aplicar} style={{ flex: 2 }} />
      </View>
      {eligiendoFecha ? (
        <SelectorFecha
          visible
          inicial={fecha ?? new Date(ahora.getTime() + DIA_MS)}
          primera={ahora}
          ultima={new Date(ahora.getTime() + 365 * DIA_MS)}
          onCerrar={() => setEligiendoFecha(false)}
          onElegir={(f) => {
            setFecha(f);
            setEligiendoFecha(false);
          }}
        />
      ) : null}
    </>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, justifyContent: 'flex-end' },
  hoja: {
    borderTopLeftRadius: AppRadii.sheet,
    borderTopRightRadius: AppRadii.sheet,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  asa: { paddingVertical: 22, alignItems: 'center' },
  asaBarra: { width: 32, height: 4, borderRadius: 2 },
  // Se encoge (no crece) para que, con mucho contenido o el teclado abierto, el pie no salga de la hoja.
  scroll: { flexGrow: 0, flexShrink: 1 },
  contenido: { paddingLeft: 24, paddingRight: 24, paddingBottom: 16 },
  pie: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 1 },
  fila: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  opcionFecha: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: AppRadii.field,
  },
  destino: { flexDirection: 'row', alignItems: 'center', minHeight: 40, paddingHorizontal: 16, borderRadius: 12 },
});
