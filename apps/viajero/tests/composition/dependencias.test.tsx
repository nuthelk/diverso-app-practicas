import { render, renderHook } from '@testing-library/react-native';
import { AppState, Text, type AppStateStatus } from 'react-native';

import { DependenciesProvider, useDependencies, vincularAutoRefresh } from '@/composition';
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
    const dependencias = dependenciasDePrueba();
    const { result } = await renderHook(() => useDependencies(), {
      wrapper: ({ children }) => <DependenciesProvider dependencias={dependencias}>{children}</DependenciesProvider>,
    });
    expect(result.current).toBe(dependencias);
    expect(Object.keys(result.current).sort()).toEqual(['auth', 'catalogo', 'pasarela', 'resenas', 'reservas']);
  });

  test('sin provider falla con un mensaje claro (el ProviderNotFoundException de Flutter)', async () => {
    function Pantalla() {
      useDependencies();
      return <Text>nunca</Text>;
    }
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<Pantalla />)).rejects.toThrow(/DependenciesProvider/);
    error.mockRestore();
  });
});

describe('crearDependenciasReales', () => {
  test('arma los repositorios reales sobre un único cliente de Supabase', () => {
    const { crearDependenciasReales } = require('@/composition/dependencias-reales') as typeof import('@/composition/dependencias-reales');
    const { dependencias, client } = crearDependenciasReales();
    expect(dependencias.auth).toBeInstanceOf(AuthRepository);
    expect(dependencias.reservas).toBeInstanceOf(BookingRepository);
    expect(dependencias.catalogo).toBeInstanceOf(CatalogRepository);
    expect(dependencias.resenas).toBeInstanceOf(ReviewRepository);
    expect(dependencias.pasarela).toBeInstanceOf(WompiPaymentGateway);
    expect(typeof client.from).toBe('function');
    return client.auth.stopAutoRefresh();
  });
});

describe('vincularAutoRefresh (supabase-js solo refresca solo en navegador)', () => {
  function clienteFalso() {
    return { auth: { startAutoRefresh: jest.fn(async () => {}), stopAutoRefresh: jest.fn(async () => {}) } };
  }

  function appStateFalso(inicial: AppStateStatus) {
    let escucha: ((estado: AppStateStatus) => void) | null = null;
    const remove = jest.fn();
    return {
      currentState: inicial,
      addEventListener: jest.fn((_tipo: 'change', cb: (estado: AppStateStatus) => void) => {
        escucha = cb;
        return { remove };
      }),
      emitir: (estado: AppStateStatus) => escucha?.(estado),
      remove,
    };
  }

  test('en nativo arranca en primer plano, se detiene en segundo plano y vuelve a arrancar', () => {
    const client = clienteFalso();
    const appState = appStateFalso('active');
    const desvincular = vincularAutoRefresh(client, { plataforma: 'android', appState });

    expect(client.auth.startAutoRefresh).toHaveBeenCalledTimes(1);
    appState.emitir('background');
    expect(client.auth.stopAutoRefresh).toHaveBeenCalledTimes(1);
    appState.emitir('active');
    expect(client.auth.startAutoRefresh).toHaveBeenCalledTimes(2);

    desvincular();
    expect(appState.remove).toHaveBeenCalled();
  });

  test('en nativo, si arranca en segundo plano no refresca hasta volver', () => {
    const client = clienteFalso();
    const appState = appStateFalso('background');
    vincularAutoRefresh(client, { plataforma: 'ios', appState });
    expect(client.auth.startAutoRefresh).not.toHaveBeenCalled();
  });

  test('en web no hace nada (supabase-js ya lo maneja con la visibilidad de la pestaña)', () => {
    const client = clienteFalso();
    const appState = appStateFalso('active');
    const desvincular = vincularAutoRefresh(client, { plataforma: 'web', appState });
    expect(client.auth.startAutoRefresh).not.toHaveBeenCalled();
    expect(appState.addEventListener).not.toHaveBeenCalled();
    desvincular();
  });

  test('por defecto usa el AppState de React Native', () => {
    const client = clienteFalso();
    const spy = jest.spyOn(AppState, 'addEventListener');
    const desvincular = vincularAutoRefresh(client, { plataforma: 'android' });
    expect(spy).toHaveBeenCalledWith('change', expect.any(Function));
    desvincular();
    spy.mockRestore();
  });
});
