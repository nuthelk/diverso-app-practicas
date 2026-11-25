import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useDependencies } from '@/composition';

import { ConsentViewModel, EstadoConsentimiento, type InstantaneaConsentimiento } from './consent-view-model';

const ContextoConsentimiento = createContext<ConsentViewModel | null>(null);

/**
 * Provider global del consentimiento (el `ChangeNotifierProvider(ConsentViewModel)` raíz más el
 * `didChangeAppLifecycleState` de `DiversoApp`): crea UN ConsentViewModel por `auth`, lo desecha
 * al desmontar y, si la verificación falló sin red, la reintenta al volver la app a primer plano.
 *
 * El VM se crea en un efecto (no en el render) para que el modo estricto de React, que monta,
 * desmonta y vuelve a montar, no deje un VM desechado en uso.
 */
export function ConsentimientoProvider({ children }: { children: ReactNode }) {
  const { auth } = useDependencies();
  const [vm, setVm] = useState<ConsentViewModel | null>(null);

  useEffect(() => {
    const nuevo = new ConsentViewModel({ auth });
    setVm(nuevo);
    const ciclo = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void nuevo.reintentar();
    });
    return () => {
      ciclo.remove();
      nuevo.dispose();
    };
  }, [auth]);

  return <ContextoConsentimiento.Provider value={vm}>{children}</ContextoConsentimiento.Provider>;
}

const verificando: InstantaneaConsentimiento = { estado: EstadoConsentimiento.verificando, pendientes: [] };
const sinSuscripcion = () => () => {};
const nada = async () => {};

export interface Consentimiento extends InstantaneaConsentimiento {
  reintentar: () => Promise<void>;
  aceptar: () => Promise<boolean>;
  cerrarSesion: () => Promise<void>;
}

/**
 * Estado y comandos del consentimiento global (`context.watch<ConsentViewModel>()`). Mientras el
 * VM no existe (primer render) se considera «verificando»: nada protegido se abre.
 */
export function useConsentimiento(): Consentimiento {
  const vm = useContext(ContextoConsentimiento);
  const instantanea = useSyncExternalStore(
    vm ? vm.suscribir : sinSuscripcion,
    () => (vm ? vm.instantanea : verificando),
    () => (vm ? vm.instantanea : verificando),
  );
  return {
    ...instantanea,
    reintentar: vm ? vm.reintentar : nada,
    aceptar: vm ? vm.aceptar : async () => false,
    cerrarSesion: vm ? vm.cerrarSesion : nada,
  };
}
