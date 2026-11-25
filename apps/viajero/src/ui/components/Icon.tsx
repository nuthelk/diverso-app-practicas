import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { StyleProp, TextStyle } from 'react-native';

import { useTheme } from '@/ui/theme';

/**
 * Íconos de la app con su nombre de Flutter (`Icons.star_rounded` → `star_rounded`).
 *
 * @expo/vector-icons solo trae MaterialIcons «filled» (sin las familias Rounded/Outlined):
 * - `*_rounded` → el mismo glifo filled de MaterialIcons (mismo dibujo, esquinas rectas).
 * - `*_outlined` → el `-outline` de MaterialIcons si existe; si no, el equivalente de
 *   MaterialCommunityIcons (MCI); si tampoco, el filled (anotado abajo).
 */
type IconFamily = 'MI' | 'MCI';

const iconMap = {
  account_balance_rounded: ['MI', 'account-balance'],
  account_balance_wallet_rounded: ['MI', 'account-balance-wallet'],
  add_rounded: ['MI', 'add'],
  arrow_back_rounded: ['MI', 'arrow-back'],
  brightness_auto_rounded: ['MI', 'brightness-auto'],
  calendar_month_rounded: ['MI', 'calendar-month'],
  check_circle_rounded: ['MI', 'check-circle'],
  check_rounded: ['MI', 'check'],
  chevron_right_rounded: ['MI', 'chevron-right'],
  clear: ['MI', 'clear'],
  close_rounded: ['MI', 'close'],
  cloud_off_rounded: ['MI', 'cloud-off'],
  compare_arrows_rounded: ['MI', 'compare-arrows'],
  credit_card_off_rounded: ['MI', 'credit-card-off'],
  credit_card_rounded: ['MI', 'credit-card'],
  currency_exchange_rounded: ['MI', 'currency-exchange'],
  dark_mode_rounded: ['MI', 'dark-mode'],
  description_outlined: ['MCI', 'file-document-outline'],
  directions_bus_rounded: ['MI', 'directions-bus'],
  error_outline_rounded: ['MI', 'error-outline'],
  event_available_rounded: ['MI', 'event-available'],
  event_busy_rounded: ['MI', 'event-busy'],
  event_outlined: ['MCI', 'calendar-blank-outline'],
  event_rounded: ['MI', 'event'],
  explore_off_rounded: ['MI', 'explore-off'],
  explore_outlined: ['MCI', 'compass-outline'],
  explore_rounded: ['MI', 'explore'],
  flag_rounded: ['MI', 'flag'],
  forest_rounded: ['MI', 'forest'],
  group_outlined: ['MCI', 'account-group-outline'],
  group_rounded: ['MI', 'group'],
  hiking_rounded: ['MI', 'hiking'],
  history_toggle_off_rounded: ['MI', 'history-toggle-off'],
  hotel_rounded: ['MI', 'hotel'],
  hourglass_top_rounded: ['MI', 'hourglass-top'],
  light_mode_rounded: ['MI', 'light-mode'],
  location_city_rounded: ['MI', 'location-city'],
  location_on_outlined: ['MCI', 'map-marker-outline'],
  location_on_rounded: ['MI', 'location-on'],
  lock_outline_rounded: ['MI', 'lock-outline'],
  lock_rounded: ['MI', 'lock'],
  logout_rounded: ['MI', 'logout'],
  luggage_rounded: ['MI', 'luggage'],
  mail_outline_rounded: ['MI', 'mail-outline'],
  // Sin «payments» outline en MI ni en MCI: queda el filled.
  payments_outlined: ['MI', 'payments'],
  payments_rounded: ['MI', 'payments'],
  person_outline_rounded: ['MI', 'person-outline'],
  person_rounded: ['MI', 'person'],
  phone_iphone_rounded: ['MI', 'phone-iphone'],
  place_outlined: ['MCI', 'map-marker-outline'],
  privacy_tip_rounded: ['MI', 'privacy-tip'],
  rate_review_outlined: ['MCI', 'comment-edit-outline'],
  rate_review_rounded: ['MI', 'rate-review'],
  receipt_long_outlined: ['MCI', 'receipt-text-outline'],
  receipt_long_rounded: ['MI', 'receipt-long'],
  receipt_rounded: ['MI', 'receipt'],
  refresh_rounded: ['MI', 'refresh'],
  remove_rounded: ['MI', 'remove'],
  restaurant_rounded: ['MI', 'restaurant'],
  schedule_rounded: ['MI', 'schedule'],
  science_outlined: ['MCI', 'flask-outline'],
  search_off_rounded: ['MI', 'search-off'],
  search_rounded: ['MI', 'search'],
  send_rounded: ['MI', 'send'],
  shield_outlined: ['MCI', 'shield-outline'],
  smartphone_rounded: ['MI', 'smartphone'],
  spa_rounded: ['MI', 'spa'],
  star_outline_rounded: ['MI', 'star-outline'],
  star_rounded: ['MI', 'star'],
  storefront_outlined: ['MCI', 'storefront-outline'],
  storefront_rounded: ['MI', 'storefront'],
  swipe_left_rounded: ['MI', 'swipe-left'],
  // Sin outline en MI ni MCI: queda el filled.
  travel_explore_outlined: ['MI', 'travel-explore'],
  tune_rounded: ['MI', 'tune'],
  verified_rounded: ['MI', 'verified'],
  verified_user_rounded: ['MI', 'verified-user'],
  // Nuevos de la app Expo (no venían de Flutter).
  visibility_off_outlined: ['MCI', 'eye-off-outline'],
  visibility_outlined: ['MCI', 'eye-outline'],
} as const satisfies Record<string, readonly [IconFamily, string]>;

/** Íconos de la app: los de la versión Flutter más los nuevos (nombres al estilo de Flutter). */
export type IconName = keyof typeof iconMap;

export interface IconProps {
  name: IconName;
  /** 24 por defecto (IconTheme de Material). */
  size?: number;
  /** Por defecto `onSurfaceVariant`, como los íconos sueltos de M3 (prefijos de campos, etc.). */
  color?: string;
  style?: StyleProp<TextStyle>;
  /** Por defecto `icono-<nombre>` (equivalente a `find.byIcon` en los tests). */
  testID?: string;
}

/** Ícono decorativo (oculto a lectores de pantalla, como `Icon` sin `semanticLabel`). */
export function Icon({ name, size = 24, color, style, testID }: IconProps) {
  const theme = useTheme();
  const [family, glyph] = iconMap[name];
  const props = {
    size,
    color: color ?? theme.colorScheme.onSurfaceVariant,
    style,
    testID: testID ?? `icono-${name}`,
    accessible: false,
    importantForAccessibility: 'no' as const,
    accessibilityElementsHidden: true,
  };
  return family === 'MCI' ? (
    <MaterialCommunityIcons name={glyph as never} {...props} />
  ) : (
    <MaterialIcons name={glyph as never} {...props} />
  );
}

/** Familia y glifo de @expo/vector-icons de un ícono de Flutter. */
export function glyphOf(name: IconName): readonly [IconFamily, string] {
  return iconMap[name];
}
