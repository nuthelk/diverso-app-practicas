import { useRouter, type Href } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppRoutes } from '@/router';
import { EmptyState, FilledButton } from '@/ui/components';
import { useTheme } from '@/ui/theme';

/** Pantalla 404 (`+not-found`, el `errorBuilder` de go_router): una URL que no existe. */
export function NotFoundView({ location }: { location: string }) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.pageBackground }]}>
      <EmptyState
        icon="explore_off_rounded"
        title="No encontramos esta página"
        message="El enlace puede estar mal escrito o la página ya no existe."
        details={location}
        action={<FilledButton text="Ir al inicio" onPress={() => router.replace(AppRoutes.explore as Href)} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 } });
