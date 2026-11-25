import { useCallback, useRef, useState } from 'react';

import type { AuthRepository, Profile, Publico } from '@/core';

/** Lo que se muestra mientras no hay nombre (cargando, error o perfil sin nombre). */
export const NOMBRE_POR_DEFECTO = 'Viajero';

/**
 * Primera letra de [nombre] en mayúscula, sin partir el carácter (gotcha 16): el grafema entero
 * (un emoji con tono de piel, una letra con tilde combinada); `V` si el nombre está vacío.
 */
export function inicialDe(nombre: string): string {
  if (nombre.length === 0) return 'V';
  const Segmentador = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  const primero = Segmentador
    ? new Segmentador(undefined, { granularity: 'grapheme' }).segment(nombre)[Symbol.iterator]().next().value?.segment
    : Array.from(nombre)[0]; // Sin Intl.Segmenter: el primer punto de código (el rune de Dart).
  return (primero ?? nombre).toUpperCase();
}

interface EstadoPerfil {
  perfil: Profile | null;
  cargando: boolean;
  error: string | null;
  email: string;
}

/**
 * ViewModel del perfil (`ProfileViewModel`): carga el perfil del viajero (nombre) y cierra la
 * sesión. El correo sale de la sesión, así que se ve aunque el perfil no cargue (supabase-js lo da
 * con una promesa: se lee en `cargar()`, aparte del perfil).
 */
export function useProfileViewModel({ auth }: { auth: Publico<AuthRepository> }) {
  const [estado, setEstado] = useState<EstadoPerfil>({ perfil: null, cargando: true, error: null, email: '' });

  const cargar = useCallback(async (): Promise<void> => {
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    const correo = auth.currentUserEmail().then(
      (email) => email ?? '',
      () => '',
    );
    try {
      const perfil = await auth.currentProfile();
      const email = await correo;
      setEstado({ perfil, cargando: false, error: null, email });
    } catch (e) {
      console.warn('ProfileViewModel.cargar:', e);
      const email = await correo;
      setEstado((s) => ({ ...s, cargando: false, error: 'No pudimos cargar tu perfil.', email }));
    }
  }, [auth]);

  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  /** Espejo síncrono de [cerrandoSesion]: un segundo toque antes del re-render ya lo ve. */
  const cerrando = useRef(false);

  /**
   * Cierra la sesión (el guard lleva al login). `false` si no se pudo. Mientras dura,
   * [cerrandoSesion]: otro pedido no vuelve a llamar a `signOut` y devuelve `null` (ignorado, no
   * es un fallo que haya que avisar).
   */
  const cerrarSesion = useCallback(async (): Promise<boolean | null> => {
    if (cerrando.current) return null;
    cerrando.current = true;
    setCerrandoSesion(true);
    try {
      await auth.signOut();
      return true;
    } catch (e) {
      console.warn('ProfileViewModel.cerrarSesion:', e);
      return false;
    } finally {
      cerrando.current = false;
      setCerrandoSesion(false);
    }
  }, [auth]);

  const nombre = estado.perfil?.nombre ?? NOMBRE_POR_DEFECTO;
  return {
    perfil: estado.perfil,
    cargando: estado.cargando,
    /** Mensaje para el usuario si el perfil no se pudo cargar. */
    error: estado.error,
    email: estado.email,
    /** Se está cerrando la sesión: el botón se deshabilita y muestra un indicador. */
    cerrandoSesion,
    nombre,
    inicial: inicialDe(nombre),
    cargar,
    cerrarSesion,
  };
}

export type ProfileViewModel = ReturnType<typeof useProfileViewModel>;
