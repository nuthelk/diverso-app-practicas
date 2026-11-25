import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useDependencies } from '@/composition';

import { ConsentViewModel, ConsentState, type ConsentSnapshot } from './consent-view-model';

const ConsentContext = createContext<ConsentViewModel | null>(null);

/**
 * Provider global del consentimiento (el `ChangeNotifierProvider(ConsentViewModel)` raíz más el
 * `didChangeAppLifecycleState` de `DiversoApp`): crea UN ConsentViewModel por `auth`, lo desecha
 * al desmontar y, si la verificación falló sin red, la reintenta al volver la app a primer plano.
 *
 * El VM se crea en un efecto (no en el render) para que el modo estricto de React, que monta,
 * desmonta y vuelve a montar, no deje un VM desechado en uso.
 */
export function ConsentProvider({ children }: { children: ReactNode }) {
  const { auth } = useDependencies();
  const [vm, setVm] = useState<ConsentViewModel | null>(null);

  useEffect(() => {
    const created = new ConsentViewModel({ auth });
    setVm(created);
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') void created.retry();
    });
    return () => {
      appStateSubscription.remove();
      created.dispose();
    };
  }, [auth]);

  return <ConsentContext.Provider value={vm}>{children}</ConsentContext.Provider>;
}

const checkingSnapshot: ConsentSnapshot = { state: ConsentState.checking, pendingDocuments: [] };
const noSubscription = () => () => {};
const noop = async () => {};

export interface Consent extends ConsentSnapshot {
  retry: () => Promise<void>;
  accept: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

/**
 * Estado y comandos del consentimiento global (`context.watch<ConsentViewModel>()`). Mientras el
 * VM no existe (primer render) se considera «verificando»: nada protegido se abre.
 */
export function useConsent(): Consent {
  const vm = useContext(ConsentContext);
  const snapshot = useSyncExternalStore(
    vm ? vm.subscribe : noSubscription,
    () => (vm ? vm.snapshot : checkingSnapshot),
    () => (vm ? vm.snapshot : checkingSnapshot),
  );
  return {
    ...snapshot,
    retry: vm ? vm.retry : noop,
    accept: vm ? vm.accept : async () => false,
    signOut: vm ? vm.signOut : noop,
  };
}
