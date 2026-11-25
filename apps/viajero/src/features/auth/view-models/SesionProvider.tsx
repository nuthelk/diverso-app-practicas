import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { useDependencies } from '@/composition';

export interface Sesion {
  /** Todavía no se leyó la sesión guardada (AsyncStorage): no se sabe si hay usuario. */
  readonly cargando: boolean;
  readonly usuarioId: string | null;
}

const cargando: Sesion = { cargando: true, usuarioId: null };
const ContextoSesion = createContext<Sesion>(cargando);

/**
 * Sesión de Supabase como estado global (lo que en Flutter leía el router con
 * `auth.currentUserId` + `GoRouterRefreshStream(auth.onAuthStateChanged)`).
 *
 * supabase_flutter tenía la sesión lista antes de `runApp`; supabase-js la lee de AsyncStorage de
 * forma asíncrona, así que hay un estado «cargando» en el que la app no pinta pantallas. Si llega
 * un evento de `onAuthStateChanged` antes que la lectura inicial, gana el evento (es más nuevo).
 */
export function SesionProvider({ children }: { children: ReactNode }) {
  const { auth } = useDependencies();
  const [sesion, setSesion] = useState<Sesion>(cargando);

  useEffect(() => {
    let vivo = true;
    let huboEvento = false;
    const fijar = (usuarioId: string | null) =>
      setSesion((antes) => (!antes.cargando && antes.usuarioId === usuarioId ? antes : { cargando: false, usuarioId }));
    const cancelar = auth.onAuthStateChanged((usuarioId) => {
      huboEvento = true;
      fijar(usuarioId);
    });
    auth.currentUserId().then(
      (usuarioId) => {
        if (vivo && !huboEvento) fijar(usuarioId);
      },
      () => {
        if (vivo && !huboEvento) fijar(null);
      },
    );
    return () => {
      vivo = false;
      cancelar();
    };
  }, [auth]);

  return <ContextoSesion.Provider value={sesion}>{children}</ContextoSesion.Provider>;
}

/** La sesión actual. Los refrescos de token del mismo usuario no cambian el valor. */
export function useSesion(): Sesion {
  return useContext(ContextoSesion);
}
