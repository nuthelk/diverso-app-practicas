import AsyncStorage from '@react-native-async-storage/async-storage';

import { createSupabaseClient, supabaseOptions } from '@/core/data/services/supabase-client';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('cliente Supabase para React Native', () => {
  test('sesión en AsyncStorage, refresco automático y sin leer la sesión de la URL', () => {
    expect(supabaseOptions().auth).toEqual({
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    });
  });

  test('crearClienteSupabase usa la configuración recibida', () => {
    const client = createSupabaseClient({
      supabaseUrl: 'http://10.0.2.2:54331',
      supabaseKey: 'clave',
      paymentResultPath: '/pago/resultado',
      mobilePaymentReturnUrl: 'https://diverso.app/pago/resultado',
    });
    expect(client.functions).toBeDefined();
    expect(typeof client.from).toBe('function');
    // No deja temporizadores de refresco corriendo (el refresco lo maneja AppState en la composición).
    return client.auth.stopAutoRefresh();
  });
});
