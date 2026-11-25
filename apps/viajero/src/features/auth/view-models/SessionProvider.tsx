import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { useDependencies } from '@/composition';

export interface Session {
  /** Todavía no se leyó la sesión guardada (AsyncStorage): no se sabe si hay usuario. */
  readonly loading: boolean;
  readonly userId: string | null;
}

const loadingSession: Session = { loading: true, userId: null };
const SessionContext = createContext<Session>(loadingSession);

/**
 * Sesión de Supabase como estado global (lo que en Flutter leía el router con
 * `auth.currentUserId` + `GoRouterRefreshStream(auth.onAuthStateChanged)`).
 *
 * supabase_flutter tenía la sesión lista antes de `runApp`; supabase-js la lee de AsyncStorage de
 * forma asíncrona, así que hay un estado «cargando» en el que la app no pinta pantallas. Si llega
 * un evento de `onAuthStateChanged` antes que la lectura inicial, gana el evento (es más nuevo).
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { auth } = useDependencies();
  const [session, setSession] = useState<Session>(loadingSession);

  useEffect(() => {
    let alive = true;
    let hadEvent = false;
    const setUserId = (userId: string | null) =>
      setSession((prev) => (!prev.loading && prev.userId === userId ? prev : { loading: false, userId }));
    const unsubscribe = auth.onAuthStateChanged((userId) => {
      hadEvent = true;
      setUserId(userId);
    });
    auth.currentUserId().then(
      (userId) => {
        if (alive && !hadEvent) setUserId(userId);
      },
      () => {
        if (alive && !hadEvent) setUserId(null);
      },
    );
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [auth]);

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

/** La sesión actual. Los refrescos de token del mismo usuario no cambian el valor. */
export function useSession(): Session {
  return useContext(SessionContext);
}
