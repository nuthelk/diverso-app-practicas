import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// Raíz de rutas. Los providers (dependencias, tema, sesión, consentimiento) llegan en T4.
export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </>
  );
}
