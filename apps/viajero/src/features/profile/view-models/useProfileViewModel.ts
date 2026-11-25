import { useCallback, useRef, useState } from 'react';

import type { AuthRepository, Profile, Public } from '@/core';

/** Lo que se muestra mientras no hay nombre (cargando, error o perfil sin nombre). */
export const DEFAULT_NAME = 'Viajero';

/**
 * Primera letra de [name] en mayúscula, sin partir el carácter (gotcha 16): el grafema entero
 * (un emoji con tono de piel, una letra con tilde combinada); `V` si el nombre está vacío.
 */
export function initialOf(name: string): string {
  if (name.length === 0) return 'V';
  const Segmenter = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  const first = Segmenter
    ? new Segmenter(undefined, { granularity: 'grapheme' }).segment(name)[Symbol.iterator]().next().value?.segment
    : Array.from(name)[0]; // Sin Intl.Segmenter: el primer punto de código (el rune de Dart).
  return (first ?? name).toUpperCase();
}

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  email: string;
}

/**
 * ViewModel del perfil (`ProfileViewModel`): carga el perfil del viajero (nombre) y cierra la
 * sesión. El correo sale de la sesión, así que se ve aunque el perfil no cargue (supabase-js lo da
 * con una promesa: se lee en `load()`, aparte del perfil).
 */
export function useProfileViewModel({ auth }: { auth: Public<AuthRepository> }) {
  const [state, setState] = useState<ProfileState>({ profile: null, loading: true, error: null, email: '' });

  const load = useCallback(async (): Promise<void> => {
    setState((e) => ({ ...e, loading: true, error: null }));
    const emailPromise = auth.currentUserEmail().then(
      (email) => email ?? '',
      () => '',
    );
    try {
      const profile = await auth.currentProfile();
      const email = await emailPromise;
      setState({ profile, loading: false, error: null, email });
    } catch (e) {
      console.warn('ProfileViewModel.load:', e);
      const email = await emailPromise;
      setState((s) => ({ ...s, loading: false, error: 'No pudimos cargar tu perfil.', email }));
    }
  }, [auth]);

  const [signingOut, setSigningOut] = useState(false);
  /** Espejo síncrono de [signingOut]: un segundo toque antes del re-render ya lo ve. */
  const signingOutRef = useRef(false);

  /**
   * Cierra la sesión (el guard lleva al login). `false` si no se pudo. Mientras dura,
   * [signingOut]: otro pedido no vuelve a llamar a `signOut` y devuelve `null` (ignorado, no
   * es un fallo que haya que avisar).
   */
  const signOut = useCallback(async (): Promise<boolean | null> => {
    if (signingOutRef.current) return null;
    signingOutRef.current = true;
    setSigningOut(true);
    try {
      await auth.signOut();
      return true;
    } catch (e) {
      console.warn('ProfileViewModel.signOut:', e);
      return false;
    } finally {
      signingOutRef.current = false;
      setSigningOut(false);
    }
  }, [auth]);

  const name = state.profile?.name ?? DEFAULT_NAME;
  return {
    profile: state.profile,
    loading: state.loading,
    /** Mensaje para el usuario si el perfil no se pudo cargar. */
    error: state.error,
    email: state.email,
    /** Se está cerrando la sesión: el botón se deshabilita y muestra un indicador. */
    signingOut,
    name,
    initial: initialOf(name),
    load,
    signOut,
  };
}

export type ProfileViewModel = ReturnType<typeof useProfileViewModel>;
