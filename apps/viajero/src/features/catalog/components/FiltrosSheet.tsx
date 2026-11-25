import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatCOP, formatFechaCorta } from '@/core';
import { FilledButton, Icono, IconButton, OutlinedButton, SectionLabel, Text, TextField } from '@/ui/components';
import { AppRadios, AppText, conAlfa, useTheme } from '@/ui/theme';

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
 */
export function FiltrosSheet({ visible, vm, onCerrar }: { visible: boolean; vm: FiltrosDelCatalogo; onCerrar: () => void }) {
  const tema = useTheme();
  const cs = tema.colorScheme;
  const abajo = useSafeAreaInsets().bottom;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <View style={estilos.raiz}>
        <Pressable accessibilityLabel="Cerrar" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.32)' }]} onPress={onCerrar} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            testID="filtros-sheet"
            style={[estilos.hoja, { backgroundColor: cs.surfaceContainerLow, paddingBottom: abajo }]}
          >
            {/* showDragHandle: 32 × 4, onSurfaceVariant al 40 %, 22 de aire arriba y abajo. */}
            <View style={estilos.asa}>
              <View style={[estilos.asaBarra, { backgroundColor: conAlfa(cs.onSurfaceVariant, 0.4) }]} />
            </View>
            {visible ? <ContenidoFiltros vm={vm} onCerrar={onCerrar} /> : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function ContenidoFiltros({ vm, onCerrar }: { vm: FiltrosDelCatalogo; onCerrar: () => void }) {
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
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={estilos.contenido}>
      <Text style={{ fontSize: AppText.encabezadoL, fontWeight: '800', letterSpacing: -0.5 }}>Filtros</Text>
      <View style={{ height: 22 }} />
      <SectionLabel texto="Fecha del plan" />
      <View style={estilos.fila}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={fecha === null ? 'Cualquier fecha' : formatFechaCorta(fecha)}
          onPress={() => setEligiendoFecha(true)}
          style={[estilos.opcionFecha, { backgroundColor: cs.surfaceContainerHigh }]}
        >
          <Icono nombre="calendar_month_rounded" size={19} color={cs.primary} />
          <Text style={{ marginLeft: 10, fontWeight: '600', fontSize: AppText.cuerpo }}>
            {fecha === null ? 'Cualquier fecha' : formatFechaCorta(fecha)}
          </Text>
        </Pressable>
        {fecha !== null ? (
          <>
            <View style={{ width: 8 }} />
            <IconButton variante="outlined" icono="close_rounded" tamanoIcono={18} tooltip="Quitar fecha" onPress={() => setFecha(null)} />
          </>
        ) : null}
      </View>
      <View style={{ height: 20 }} />
      <SectionLabel texto="Precio máximo por persona" />
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
          style={{ width: 110, textAlign: 'right', fontWeight: '700', fontSize: AppText.cuerpoChico }}
        >
          {precio === null || precio === 0 ? 'Sin límite' : formatCOP(precio)}
        </Text>
      </View>
      <View style={{ height: 20 }} />
      {/* Buscador + lista propia (el menú desplegable dentro de la hoja no recibía los gestos). */}
      <SectionLabel texto="Destino" />
      <TextField
        valor={busqueda}
        onChangeText={setBusqueda}
        pista="Buscar destino…"
        icono="search_rounded"
        returnKeyType="search"
        testID="buscar-destino"
      />
      <View style={{ height: 8 }} />
      <ScrollView nestedScrollEnabled style={{ maxHeight: 192 }} keyboardShouldPersistTaps="handled">
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
              style={({ pressed }) => [estilos.destino, pressed ? { backgroundColor: conAlfa(cs.onSurface, 0.1) } : null]}
            >
              <Icono
                nombre={esTodos ? 'travel_explore_outlined' : sel ? 'check_circle_rounded' : 'location_on_outlined'}
                size={19}
                color={sel ? cs.primary : cs.onSurfaceVariant}
              />
              <Text
                numberOfLines={1}
                style={{
                  marginLeft: 16,
                  flex: 1,
                  fontSize: AppText.cuerpo,
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
      <View style={{ height: 24 }} />
      <View style={estilos.fila}>
        <OutlinedButton texto="Limpiar" onPress={limpiar} style={estilos.flex} />
        <View style={{ width: 12 }} />
        <FilledButton icono="check_rounded" texto="Aplicar filtros" onPress={aplicar} style={{ flex: 2 }} />
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
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, justifyContent: 'flex-end' },
  hoja: {
    borderTopLeftRadius: AppRadios.sheet,
    borderTopRightRadius: AppRadios.sheet,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  asa: { paddingVertical: 22, alignItems: 'center' },
  asaBarra: { width: 32, height: 4, borderRadius: 2 },
  contenido: { paddingLeft: 24, paddingRight: 24, paddingBottom: 24 },
  fila: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  opcionFecha: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: AppRadios.field,
  },
  destino: { flexDirection: 'row', alignItems: 'center', minHeight: 40, paddingHorizontal: 16, borderRadius: 12 },
});
