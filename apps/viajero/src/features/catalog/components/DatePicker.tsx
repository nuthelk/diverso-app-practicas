import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { LONG_MONTH_NAMES, formatShortDate } from '@/core';
import { IconButton, Text, TextButton } from '@/ui/components';
import { AppText, withAlpha, useTheme } from '@/ui/theme';

const WEEKDAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const dateOnly = (f: Date) => new Date(f.getFullYear(), f.getMonth(), f.getDate());
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * `showDatePicker` de Material (calendario en un diálogo): elige un día entre [firstDate] y
 * [lastDate] (inclusive), arrancando en [initialDate]. «Aceptar» devuelve el día (medianoche local);
 * «Cancelar» o tocar fuera, nada.
 */
export function DatePicker({
  visible,
  initialDate,
  firstDate,
  lastDate,
  onPick,
  onClose,
}: {
  visible: boolean;
  initialDate: Date;
  firstDate: Date;
  lastDate: Date;
  onPick: (date: Date) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const cs = theme.colorScheme;
  const [picked, setPicked] = useState(() => dateOnly(initialDate));
  const [month, setMonth] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const minDay = dateOnly(firstDate);
  const maxDay = dateOnly(lastDate);
  const today = dateOnly(new Date());

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leadingBlanks = month.getDay();
  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  const canGoBack = new Date(month.getFullYear(), month.getMonth(), 0) >= minDay;
  const canGoForward = new Date(month.getFullYear(), month.getMonth() + 1, 1) <= maxDay;
  const moveMonth = (delta: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Cerrar" style={[styles.scrim, { backgroundColor: 'rgba(0,0,0,0.54)' }]} onPress={onClose}>
        <Pressable testID="selector-fecha" style={[styles.dialog, { backgroundColor: cs.surfaceContainerHigh }]}>
          <View style={styles.header}>
            <Text style={{ fontSize: AppText.caption, fontWeight: '500', color: cs.onSurfaceVariant }}>Seleccionar fecha</Text>
            <Text style={{ fontSize: 32, fontWeight: '400', marginTop: 20, color: cs.onSurfaceVariant }} height={1.25}>
              {formatShortDate(picked)}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: cs.outlineVariant }]} />
          <View style={styles.month}>
            <Text style={{ flex: 1, fontSize: AppText.body, fontWeight: '600', color: cs.onSurfaceVariant }}>
              {`${LONG_MONTH_NAMES[month.getMonth()]} de ${month.getFullYear()}`}
            </Text>
            {/* Sin `chevron_left` en el mapa de íconos: el mismo glifo girado. */}
            <View style={styles.rotated}>
              <IconButton icon="chevron_right_rounded" tooltip="Mes anterior" onPress={canGoBack ? () => moveMonth(-1) : null} />
            </View>
            <IconButton icon="chevron_right_rounded" tooltip="Mes siguiente" onPress={canGoForward ? () => moveMonth(1) : null} />
          </View>
          <View style={styles.week}>
            {WEEKDAYS.map((d, i) => (
              <Text key={i} style={[styles.cellText, { color: cs.onSurface, fontSize: AppText.caption }]}>
                {d}
              </Text>
            ))}
          </View>
          <View style={styles.days}>
            {cells.map((day, i) => {
              if (!day) return <View key={`h${i}`} style={styles.cell} />;
              const enabled = day >= minDay && day <= maxDay;
              const isSelected = isSameDay(day, picked);
              const isToday = isSameDay(day, today);
              return (
                <Pressable
                  key={day.getDate()}
                  disabled={!enabled}
                  onPress={() => setPicked(day)}
                  accessibilityRole="button"
                  accessibilityLabel={formatShortDate(day)}
                  accessibilityState={{ disabled: !enabled, selected: isSelected }}
                  style={styles.cell}
                >
                  <View
                    style={[
                      styles.circle,
                      isSelected ? { backgroundColor: cs.primary } : isToday ? { borderWidth: 1, borderColor: cs.primary } : null,
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: AppText.body,
                        color: isSelected ? cs.onPrimary : !enabled ? withAlpha(cs.onSurface, 0.38) : isToday ? cs.primary : cs.onSurface,
                      }}
                    >
                      {String(day.getDate())}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.actions}>
            <TextButton text="Cancelar" onPress={onClose} style={styles.intrinsic} />
            <TextButton text="Aceptar" onPress={() => onPick(picked)} style={styles.intrinsic} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: 328, maxWidth: '100%', borderRadius: 28, paddingBottom: 8, overflow: 'hidden' },
  header: { paddingLeft: 24, paddingRight: 12, paddingTop: 16, paddingBottom: 12 },
  divider: { height: 1 },
  month: { flexDirection: 'row', alignItems: 'center', paddingLeft: 24, paddingRight: 8, paddingTop: 4 },
  rotated: { transform: [{ rotate: '180deg' }] },
  week: { flexDirection: 'row', paddingHorizontal: 12 },
  days: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  cell: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' },
  cellText: { width: `${100 / 7}%`, textAlign: 'center', paddingVertical: 8 },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, gap: 8 },
  intrinsic: { alignSelf: 'flex-end' },
});
