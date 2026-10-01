import { supabase } from './supabase';

/** Estado de sesión global (runes) + helpers de auth. */
export const auth = $state({
  ready: false,
  userId: null as string | null,
  email: null as string | null,
});

supabase.auth.onAuthStateChange((_evento, sesion) => {
  auth.userId = sesion?.user?.id ?? null;
  auth.email = (sesion?.user?.email as string | undefined) ?? null;
  auth.ready = true;
});

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
  location.hash = '#/login';
}

export interface ProfileInfo {
  rol: 'viajero' | 'agencia' | 'admin';
}

export async function perfilActual(): Promise<ProfileInfo> {
  const uid = auth.userId;
  if (!uid) throw new Error('sin sesión');
  const { data, error } = await supabase.from('profiles').select('rol').eq('id', uid).single();
  if (error) throw error;
  return data as ProfileInfo;
}
