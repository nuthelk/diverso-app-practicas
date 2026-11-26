import { render, renderHook } from '@testing-library/react-native';
import { AppState, Text, type AppStateStatus } from 'react-native';

import { DependenciesProvider, useDependencies, bindAutoRefresh } from '@/composition';
import {
  AuthRepository,
  BookingRepository,
  CatalogRepository,
  ReviewRepository,
  WompiPaymentGateway,
} from '@/core';

import { dependenciasDePrueba } from '../support/dependencias-de-prueba';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/**
 * Raíz de composición (`composition_root.dart` + `main.dart`): las pantallas piden los repos con
 * `useDependencies()`; en producción salen de Supabase y en pruebas son dobles.
 */
describe('DependenciesProvider / useDependencies', () => {
  test('entrega los cinco repositorios que se le pasan', async () => {
    const dependencies = dependenciasDePrueba();
    const { result } = await renderHook(() => useDependencies(), {
      wrapper: ({ children }) => <DependenciesProvider dependencies={dependencies}>{children}</DependenciesProvider>,
    });
    expect(result.current).toBe(dependencies);
    expect(Object.keys(result.current).sort()).toEqual(['auth', 'bookings', 'catalog', 'gateway', 'reviews']);
  });

  test('sin provider falla con un mensaje claro (el ProviderNotFoundException de Flutter)', async () => {
    function Screen() {
      useDependencies();
      return <Text>nunca</Text>;
    }
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<Screen />)).rejects.toThrow(/DependenciesProvider/);
    error.mockRestore();
  });
});

describe('createRealDependencies', () => {
  test('arma los repositorios reales sobre un único cliente de Supabase', () => {
    const { createRealDependencies } = require('@/composition/real-dependencies') as typeof import('@/composition/real-dependencies');
    const { dependencies, client } = createRealDependencies();
    expect(dependencies.auth).toBeInstanceOf(AuthRepository);
    expect(dependencies.bookings).toBeInstanceOf(BookingRepository);
    expect(dependencies.catalog).toBeInstanceOf(CatalogRepository);
    expect(dependencies.reviews).toBeInstanceOf(ReviewRepository);
    expect(dependencies.gateway).toBeInstanceOf(WompiPaymentGateway);
    expect(typeof client.from).toBe('function');
    return client.auth.stopAutoRefresh();
  });
});

describe('bindAutoRefresh (supabase-js solo refresca solo en navegador)', () => {
  function fakeClient() {
    return { auth: { startAutoRefresh: jest.fn(async () => {}), stopAutoRefresh: jest.fn(async () => {}) } };
  }

  function fakeAppState(initial: AppStateStatus) {
    let listener: ((state: AppStateStatus) => void) | null = null;
    const remove = jest.fn();
    return {
      currentState: initial,
      addEventListener: jest.fn((_eventType: 'change', cb: (state: AppStateStatus) => void) => {
        listener = cb;
        return { remove };
      }),
      emit: (state: AppStateStatus) => listener?.(state),
      remove,
    };
  }

  test('en nativo arranca en primer plano, se detiene en segundo plano y vuelve a arrancar', () => {
    const client = fakeClient();
    const appState = fakeAppState('active');
    const unbind = bindAutoRefresh(client, { platform: 'android', appState });

    expect(client.auth.startAutoRefresh).toHaveBeenCalledTimes(1);
    appState.emit('background');
    expect(client.auth.stopAutoRefresh).toHaveBeenCalledTimes(1);
    appState.emit('active');
    expect(client.auth.startAutoRefresh).toHaveBeenCalledTimes(2);

    unbind();
    expect(appState.remove).toHaveBeenCalled();
  });

  test('en nativo, si arranca en segundo plano no refresca hasta volver', () => {
    const client = fakeClient();
    const appState = fakeAppState('background');
    bindAutoRefresh(client, { platform: 'ios', appState });
    expect(client.auth.startAutoRefresh).not.toHaveBeenCalled();
  });

  test('en web no hace nada (supabase-js ya lo maneja con la visibilidad de la pestaña)', () => {
    const client = fakeClient();
    const appState = fakeAppState('active');
    const unbind = bindAutoRefresh(client, { platform: 'web', appState });
    expect(client.auth.startAutoRefresh).not.toHaveBeenCalled();
    expect(appState.addEventListener).not.toHaveBeenCalled();
    unbind();
  });

  test('por defecto usa el AppState de React Native', () => {
    const client = fakeClient();
    const spy = jest.spyOn(AppState, 'addEventListener');
    const unbind = bindAutoRefresh(client, { platform: 'android' });
    expect(spy).toHaveBeenCalledWith('change', expect.any(Function));
    unbind();
    spy.mockRestore();
  });
});
