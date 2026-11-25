import { supabase } from '@/shared/api/supabase';
import { crearStore, useStore } from '@/shared/lib/store';

/** Estado de sesión global + helpers de auth. */
export const auth = crearStore({
  ready: false,
  userId: null as string | null,
  email: null as string | null,
});

supabase.auth.onAuthStateChange((_evento, sesion) => {
  auth.set({
    userId: sesion?.user?.id ?? null,
    email: (sesion?.user?.email as string | undefined) ?? null,
    ready: true,
  });
});

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/**
 * Cierra la sesión. No navega: el modelo no conoce el router. Quien la llama desde la interfaz usa
 * `useCerrarSesion()`, que además lleva a /login (también el guard del layout raíz manda ahí a quien quede sin sesión).
 */
export async function signOut() {
  await supabase.auth.signOut();
}

export interface ProfileInfo {
  rol: 'viajero' | 'agencia' | 'admin';
}

export async function perfilActual(): Promise<ProfileInfo> {
  const uid = auth.get().userId;
  if (!uid) throw new Error('sin sesión');
  const { data, error } = await supabase.from('profiles').select('rol').eq('id', uid).single();
  if (error) throw error;
  return data as ProfileInfo;
}

/** La sesión actual (`ready`, `userId`, `email`), para dibujar según haya o no sesión. */
export function useAuth() {
  return useStore(auth);
}
