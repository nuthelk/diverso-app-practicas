import { StyleSheet, View } from 'react-native';

import { IconButton, SectionLabel, Text } from '@/ui/components';
import { AppRadii, AppText, useTheme } from '@/ui/theme';

const SIDE = 38;

/**
 * «¿Cuántos viajan?»: botones − / + con el número de personas y los cupos de la fecha. Qué botones
 * se habilitan lo decide el view model (`canRemoveTraveler` / `canAddTraveler`).
 */
export function TravelersPicker({
  pax,
  availableSpots,
  canRemove,
  canAdd,
  onChange,
}: {
  pax: number;
  availableSpots: number;
  canRemove: boolean;
  canAdd: boolean;
  onChange: (value: number) => void;
}) {
  const cs = useTheme().colorScheme;
  return (
    <View>
      <SectionLabel text="Personas" />
      <View style={[styles.box, { backgroundColor: cs.surfaceContainerLow }]}>
        <View style={styles.question}>
          <Text style={{ fontWeight: '600' }}>¿Cuántos viajan?</Text>
        </View>
        <TravelerButton remove enabled={canRemove} onTap={() => onChange(pax - 1)} />
        <View style={styles.number}>
          <Text style={{ fontSize: AppText.headingXs, fontWeight: '800', textAlign: 'center' }}>{String(pax)}</Text>
        </View>
        <TravelerButton enabled={canAdd} onTap={() => onChange(pax + 1)} />
      </View>
      <View style={{ height: 6 }} />
      <Text style={{ fontSize: AppText.caption, color: cs.onSurfaceVariant }}>
        {`${availableSpots} cupos disponibles para esta fecha`}
      </Text>
    </View>
  );
}

/** `IconButton.outlined` 38×38: borde e ícono primary si está habilitado; si no, outlineVariant/outline. */
function TravelerButton({ remove = false, enabled, onTap }: { remove?: boolean; enabled: boolean; onTap: () => void }) {
  const cs = useTheme().colorScheme;
  return (
    <IconButton
      variant="outlined"
      icon={remove ? 'remove_rounded' : 'add_rounded'}
      tooltip={remove ? 'Quitar una persona' : 'Agregar una persona'}
      iconSize={18}
      iconColor={enabled ? cs.primary : cs.outline}
      onPress={enabled ? onTap : null}
      style={[styles.button, { borderColor: enabled ? cs.primary : cs.outlineVariant }]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: AppRadii.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  question: { flex: 1, minWidth: 0 },
  number: { width: 52 },
  // `minimumSize`/`maximumSize` 38 de Flutter; el área táctil «padded» de 48 ocupa 5 a cada lado.
  button: { width: SIDE, height: SIDE, borderRadius: SIDE / 2, margin: 5 },
});
