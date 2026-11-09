import { supabase } from '$lib/shared/api/supabase';
import type { Agency } from '../model/agencia';
import type { DatosAgenciaGuardables } from '../model/datos-agencia';
import { BUCKET_LOGOS, rutaDeLogo, rutaNuevaLogo, validarLogo } from '../model/logo';

/** Datos de la agencia de la sesión: perfil, registro y logo. */

export async function miAgencia(): Promise<Agency | null> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from('agencies')
    .select('*')
    .eq('owner_user_id', uid)
    .maybeSingle();
  if (error) throw error;
  return (data as Agency | null) ?? null;
}

export async function registrarAgencia(datos: {
  nombre: string;
  numero_rnt: string;
  matricula_camara_comercio: string;
  ciudad: string;
  telefono: string;
  email: string;
  whatsapp: string;
  descripcion: string;
}): Promise<void> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  const { error } = await supabase.from('agencies').insert({
    owner_user_id: uid,
    ...datos,
    // estado_verificacion queda 'pendiente' por la política RLS
  });
  if (error) throw error;
}

/**
 * Edita los datos de contacto de la agencia. Escribe solo estas seis columnas, una por una: el RNT y la matrícula no se
 * editan aquí (cambiarlos obliga a re-verificar) y la base ignora estado, comisión y vigencia si los manda la dueña.
 */
export async function actualizarDatosAgencia(agencyId: string, datos: DatosAgenciaGuardables): Promise<void> {
  const { nombre, descripcion, ciudad, telefono, email, whatsapp } = datos;
  const { error } = await supabase
    .from('agencies')
    .update({ nombre, descripcion, ciudad, telefono, email, whatsapp })
    .eq('id', agencyId);
  if (error) throw error;
}

/* Logo de la agencia (bucket público `agency-logos`, carpeta `<agency_id>/`) ----- */

type AgenciaConLogo = Pick<Agency, 'id' | 'logo_url'>;

/** Borrar el objeto viejo es limpieza: si falla, el logo nuevo igual quedó guardado. */
async function borrarObjetoLogo(ruta: string | null): Promise<void> {
  if (!ruta) return;
  try {
    await supabase.storage.from(BUCKET_LOGOS).remove([ruta]);
  } catch {
    /* queda un archivo huérfano en la carpeta de la agencia; no afecta al logo vigente */
  }
}

/** Sube un logo con nombre único, lo fija en `agencies.logo_url` y borra el anterior. Devuelve la URL pública. */
export async function subirLogo(agencia: AgenciaConLogo, archivo: File): Promise<string> {
  const problema = validarLogo(archivo);
  if (problema) throw new Error(problema);

  const bucket = supabase.storage.from(BUCKET_LOGOS);
  const ruta = rutaNuevaLogo(agencia.id, archivo.type);
  const { error: errorSubida } = await bucket.upload(ruta, archivo, {
    contentType: archivo.type,
    cacheControl: '31536000', // el nombre cambia en cada subida: se puede cachear un año
    upsert: false,
  });
  if (errorSubida) throw errorSubida;

  const url = bucket.getPublicUrl(ruta).data.publicUrl;
  const { error } = await supabase.from('agencies').update({ logo_url: url }).eq('id', agencia.id);
  if (error) {
    await borrarObjetoLogo(ruta);
    throw error;
  }
  await borrarObjetoLogo(rutaDeLogo(agencia.logo_url, agencia.id));
  return url;
}

/** Quita el logo: primero deja de apuntar a él y luego borra el objeto. */
export async function quitarLogo(agencia: AgenciaConLogo): Promise<void> {
  const { error } = await supabase.from('agencies').update({ logo_url: null }).eq('id', agencia.id);
  if (error) throw error;
  await borrarObjetoLogo(rutaDeLogo(agencia.logo_url, agencia.id));
}
