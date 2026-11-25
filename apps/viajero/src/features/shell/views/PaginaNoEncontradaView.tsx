import { useRouter, type Href } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppRoutes } from '@/router';
import { EmptyState, FilledButton } from '@/ui/components';
import { useTheme } from '@/ui/theme';

/** Pantalla 404 (`+not-found`, el `errorBuilder` de go_router): una URL que no existe. */
export function PaginaNoEncontradaView({ ubicacion }: { ubicacion: string }) {
  const tema = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: tema.pageBackground }]}>
      <EmptyState
        icono="explore_off_rounded"
        titulo="No encontramos esta página"
        mensaje="El enlace puede estar mal escrito o la página ya no existe."
        detalle={ubicacion}
        accion={<FilledButton texto="Ir al inicio" onPress={() => router.replace(AppRoutes.explorar as Href)} />}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({ pantalla: { flex: 1 } });
