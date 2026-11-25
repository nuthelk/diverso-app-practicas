import { useRef, useState } from 'react';

import type { AuthRepository, Public } from '@/core';

/** Credenciales de la cuenta de pruebas del seed. */
export const DEMO_EMAIL = 'viajero@demo.com';
export const DEMO_PASSWORD = 'demo1234';

interface LoginState {
  isSignUp: boolean;
  loading: boolean;
  acceptsDataPolicy: boolean;
  acceptsTerms: boolean;
  /** Ya se intentó crear la cuenta: las casillas sin marcar se resaltan. */
  signUpAttempted: boolean;
  /** Mensaje para el usuario si el último envío falló. */
  error: string | null;
}

const initialState: LoginState = {
  isSignUp: false,
  loading: false,
  acceptsDataPolicy: false,
  acceptsTerms: false,
  signUpAttempted: false,
  error: null,
};

/**
 * ViewModel del acceso (`LoginViewModel`): alterna entre entrar y crear cuenta, guarda las
 * casillas de autorización (Ley 1581) y envía el formulario. Los campos de texto y su validación
 * viven en la vista.
 *
 * [demoAccount] decide si se ofrece «Usar cuenta demo»; por defecto solo en desarrollo (`__DEV__`,
 * el `kDebugMode` de Flutter): en producción la clave de la cuenta de pruebas no debe estar a un
 * toque.
 *
 * El estado vive en un `useState` y en un ref espejo que leen los comandos: así un envío hecho
 * con un cierre de un render anterior (doble toque) ve que ya está cargando. No hace falta el
 * mixin `NotificaSiVive` de Flutter: React ignora un `setState` después de desmontar (no lanza
 * como `notifyListeners` tras `dispose`), así que una respuesta tardía no rompe nada.
 */
export function useLoginViewModel({
  auth,
  demoAccount = __DEV__,
}: {
  auth: Public<AuthRepository>;
  demoAccount?: boolean;
}) {
  const [state, setState] = useState<LoginState>(initialState);
  const latest = useRef<LoginState>(initialState);

  const update = (changes: Partial<LoginState>) => {
    latest.current = { ...latest.current, ...changes };
    setState(latest.current);
  };

  const toggleMode = () => update({ isSignUp: !latest.current.isSignUp, error: null, signUpAttempted: false });
  const setAcceptsDataPolicy = (value: boolean) => update({ acceptsDataPolicy: value });
  const setAcceptsTerms = (value: boolean) => update({ acceptsTerms: value });

  /**
   * Entra o crea la cuenta con lo escrito en el formulario. Al crear cuenta la autorización debe
   * ser expresa: sin las dos casillas no se envía nada. En éxito no navega: el guard saca al
   * usuario de aquí al cambiar la sesión.
   */
  const submit = async ({
    isFormValid,
    name,
    email,
    password,
  }: {
    isFormValid: boolean;
    name: string;
    email: string;
    password: string;
  }): Promise<void> => {
    const e = latest.current;
    if (e.loading) return;
    if (e.isSignUp) {
      update({ signUpAttempted: true });
      if (!e.acceptsDataPolicy || !e.acceptsTerms) return;
    }
    if (!isFormValid) return;
    update({ loading: true, error: null });
    try {
      if (e.isSignUp) {
        await auth.signUpTraveler({
          name: name.trim(),
          email: email.trim(),
          password,
          acceptsDocuments: e.acceptsDataPolicy && e.acceptsTerms,
        });
      } else {
        await auth.signIn({ email: email.trim(), password });
      }
    } catch (error) {
      console.warn('LoginViewModel.submit:', error);
      update({
        error: e.isSignUp
          ? 'No pudimos crear la cuenta. ¿Ese correo ya está registrado?'
          : 'Correo o contraseña incorrectos, o no hay conexión.',
      });
    } finally {
      update({ loading: false });
    }
  };

  return {
    ...state,
    /** «Usar cuenta demo» solo se ofrece al entrar, y solo si el flag lo permite. */
    offersDemoAccount: demoAccount && !state.isSignUp,
    toggleMode,
    setAcceptsDataPolicy,
    setAcceptsTerms,
    submit,
  };
}

export type LoginViewModel = ReturnType<typeof useLoginViewModel>;
