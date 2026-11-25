import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatCOP, formatShortDate } from '@/core';
import { FilledButton, Icon, IconButton, OutlinedButton, SectionLabel, Text, TextField } from '@/ui/components';
import { AppRadii, AppText, withAlpha, useTheme } from '@/ui/theme';

import { PriceSlider } from './PriceSlider';
import { DatePicker } from './DatePicker';

/** Límites del precio máximo por persona (COP). En [MAX_PRICE] el filtro queda sin límite. */
export const MIN_PRICE = 50000;
export const MAX_PRICE = 600000;
export const PRICE_DIVISIONS = 11;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Lo que la hoja lee del view model del catálogo y el comando que llama al aplicar. */
export interface FiltersSheetModel {
  destination: string | null;
  maxPrice: number | null;
  date: Date | null;
  destinations: readonly string[];
  applyFilters: (f: { destination?: string | null; maxPrice?: number | null; date?: Date | null }) => Promise<void>;
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
export function FiltersSheet({ visible, vm, onClose }: { visible: boolean; vm: FiltersSheetModel; onClose: () => void }) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const bottomInset = useSafeAreaInsets().bottom;
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView testID="filtros-teclado" behavior="padding" style={styles.root}>
        <Pressable accessibilityLabel="Cerrar" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.32)' }]} onPress={onClose} />
        <View testID="filtros-sheet" style={[styles.sheet, { backgroundColor: cs.surfaceContainerLow }]}>
          {/* showDragHandle: 32 × 4, onSurfaceVariant al 40 %, 22 de aire arriba y abajo. */}
          <View style={styles.handle}>
            <View style={[styles.handleBar, { backgroundColor: withAlpha(cs.onSurfaceVariant, 0.4) }]} />
          </View>
          {visible ? <FiltersContent vm={vm} onClose={onClose} bottomInset={bottomInset} /> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FiltersContent({ vm, onClose, bottomInset }: { vm: FiltersSheetModel; onClose: () => void; bottomInset: number }) {
  const cs = useTheme().colorScheme;
  const [price, setPrice] = useState<number | null>(vm.maxPrice);
  const [date, setDate] = useState<Date | null>(vm.date);
  const [destination, setDestination] = useState<string>(vm.destination ?? '');
  const [query, setQuery] = useState('');
  const [pickingDate, setPickingDate] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();
  const options = ['Todos los destinos', ...vm.destinations.filter((d) => d.toLowerCase().includes(normalizedQuery))];

  const clear = () => {
    setDate(null);
    setPrice(null);
    setDestination('');
    setQuery('');
  };
  const apply = () => {
    onClose();
    void vm.applyFilters({ destination: destination === '' ? null : destination, maxPrice: price, date });
  };

  const now = new Date();
  return (
    <>
      <ScrollView testID="filtros-scroll" keyboardShouldPersistTaps="handled" style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={{ fontSize: AppText.headingL, fontWeight: '800', letterSpacing: -0.5 }}>Filtros</Text>
        <View style={{ height: 22 }} />
        <SectionLabel text="Fecha del plan" />
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={date === null ? 'Cualquier fecha' : formatShortDate(date)}
            onPress={() => setPickingDate(true)}
            style={[styles.dateOption, { backgroundColor: cs.surfaceContainerHigh }]}
          >
            <Icon name="calendar_month_rounded" size={19} color={cs.primary} />
            <Text style={{ marginLeft: 10, fontWeight: '600', fontSize: AppText.body }}>
              {date === null ? 'Cualquier fecha' : formatShortDate(date)}
            </Text>
          </Pressable>
          {date !== null ? (
            <>
              <View style={{ width: 8 }} />
              <IconButton variant="outlined" icon="close_rounded" iconSize={18} tooltip="Quitar fecha" onPress={() => setDate(null)} />
            </>
          ) : null}
        </View>
        <View style={{ height: 20 }} />
        <SectionLabel text="Precio máximo por persona" />
        <View style={styles.row}>
          <View style={styles.flex}>
            <PriceSlider
              accessibilityLabel="Precio máximo por persona"
              value={Math.min(Math.max(price ?? MAX_PRICE, MIN_PRICE), MAX_PRICE)}
              min={MIN_PRICE}
              max={MAX_PRICE}
              divisions={PRICE_DIVISIONS}
              label={formatCOP}
              onChange={(v) => setPrice(v >= MAX_PRICE ? null : v)}
            />
          </View>
          <Text
            testID="valor-precio"
            style={{ width: 110, textAlign: 'right', fontWeight: '700', fontSize: AppText.smallBody }}
          >
            {price === null || price === 0 ? 'Sin límite' : formatCOP(price)}
          </Text>
        </View>
        <View style={{ height: 20 }} />
        {/* Buscador + lista propia (el menú desplegable dentro de la hoja no recibía los gestos). La
            lista NO es un scroll anidado: con uno propio, el gesto sobre los destinos solo movía esa
            lista y no la hoja. */}
        <SectionLabel text="Destino" />
        <TextField
          value={query}
          onChangeText={setQuery}
          hint="Buscar destino…"
          icon="search_rounded"
          returnKeyType="search"
          testID="buscar-destino"
        />
        <View style={{ height: 8 }} />
        {options.map((d, i) => {
          const isAll = i === 0;
          const isSelected = destination === (isAll ? '' : d);
          return (
            <Pressable
              key={d}
              testID={isAll ? 'destino-todos' : `destino-${d}`}
              accessibilityRole="button"
              accessibilityLabel={d}
              accessibilityState={{ selected: isSelected }}
              onPress={() => setDestination(isAll ? '' : d)}
              style={({ pressed }) => [styles.destination, pressed ? { backgroundColor: withAlpha(cs.onSurface, 0.1) } : null]}
            >
              <Icon
                name={isAll ? 'travel_explore_outlined' : isSelected ? 'check_circle_rounded' : 'location_on_outlined'}
                size={19}
                color={isSelected ? cs.primary : cs.onSurfaceVariant}
              />
              <Text
                numberOfLines={1}
                style={{
                  marginLeft: 16,
                  flex: 1,
                  fontSize: AppText.body,
                  fontWeight: isSelected ? '700' : '500',
                  color: isSelected ? cs.primary : cs.onSurface,
                }}
              >
                {d}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {/* Pie fijo: siempre visible por larga que sea la lista; el inset inferior es su relleno. */}
      <View testID="filtros-pie" style={[styles.footer, { paddingBottom: 16 + bottomInset, borderTopColor: withAlpha(cs.outlineVariant, 0.5) }]}>
        <OutlinedButton text="Limpiar" onPress={clear} style={styles.flex} />
        <View style={{ width: 12 }} />
        <FilledButton icon="check_rounded" text="Aplicar filtros" onPress={apply} style={{ flex: 2 }} />
      </View>
      {pickingDate ? (
        <DatePicker
          visible
          initialDate={date ?? new Date(now.getTime() + DAY_MS)}
          firstDate={now}
          lastDate={new Date(now.getTime() + 365 * DAY_MS)}
          onClose={() => setPickingDate(false)}
          onPick={(f) => {
            setDate(f);
            setPickingDate(false);
          }}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: AppRadii.sheet,
    borderTopRightRadius: AppRadii.sheet,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  handle: { paddingVertical: 22, alignItems: 'center' },
  handleBar: { width: 32, height: 4, borderRadius: 2 },
  // Se encoge (no crece) para que, con mucho contenido o el teclado abierto, el pie no salga de la hoja.
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { paddingLeft: 24, paddingRight: 24, paddingBottom: 16 },
  footer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  dateOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: AppRadii.field,
  },
  destination: { flexDirection: 'row', alignItems: 'center', minHeight: 40, paddingHorizontal: 16, borderRadius: 12 },
});
