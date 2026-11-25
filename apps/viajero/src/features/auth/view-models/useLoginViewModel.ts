import { useRef, useState } from 'react';

import type { AuthRepository, Public } from '@/core';

/** Credenciales de la cuenta de pruebas del seed. */
export const CORREO_DEMO = 'viajero@demo.com';
export const CLAVE_DEMO = 'demo1234';

interface EstadoLogin {
  esRegistro: boolean;
  cargando: boolean;
  aceptaDatos: boolean;
  aceptaTerminos: boolean;
  /** Ya se intentó crear la cuenta: las casillas sin marcar se resaltan. */
  intentoRegistro: boolean;
  /** Mensaje para el usuario si el último envío falló. */
  error: string | null;
}

const inicial: EstadoLogin = {
  esRegistro: false,
  cargando: false,
  aceptaDatos: false,
  aceptaTerminos: false,
  intentoRegistro: false,
  error: null,
};

/**
 * ViewModel del acceso (`LoginViewModel`): alterna entre entrar y crear cuenta, guarda las
 * casillas de autorización (Ley 1581) y envía el formulario. Los campos de texto y su validación
 * viven en la vista.
 *
 * [cuentaDemo] decide si se ofrece «Usar cuenta demo»; por defecto solo en desarrollo (`__DEV__`,
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
  cuentaDemo = __DEV__,
}: {
  auth: Public<AuthRepository>;
  cuentaDemo?: boolean;
}) {
  const [estado, setEstado] = useState<EstadoLogin>(inicial);
  const actual = useRef<EstadoLogin>(inicial);

  const cambiar = (cambios: Partial<EstadoLogin>) => {
    actual.current = { ...actual.current, ...cambios };
    setEstado(actual.current);
  };

  const alternarModo = () => cambiar({ esRegistro: !actual.current.esRegistro, error: null, intentoRegistro: false });
  const cambiarAceptaDatos = (valor: boolean) => cambiar({ aceptaDatos: valor });
  const cambiarAceptaTerminos = (valor: boolean) => cambiar({ aceptaTerminos: valor });

  /**
   * Entra o crea la cuenta con lo escrito en el formulario. Al crear cuenta la autorización debe
   * ser expresa: sin las dos casillas no se envía nada. En éxito no navega: el guard saca al
   * usuario de aquí al cambiar la sesión.
   */
  const enviar = async ({
    formularioValido,
    nombre,
    email,
    password,
  }: {
    formularioValido: boolean;
    nombre: string;
    email: string;
    password: string;
  }): Promise<void> => {
    const e = actual.current;
    if (e.cargando) return;
    if (e.esRegistro) {
      cambiar({ intentoRegistro: true });
      if (!e.aceptaDatos || !e.aceptaTerminos) return;
    }
    if (!formularioValido) return;
    cambiar({ cargando: true, error: null });
    try {
      if (e.esRegistro) {
        await auth.signUpViajero({
          nombre: nombre.trim(),
          email: email.trim(),
          password,
          aceptaDocumentos: e.aceptaDatos && e.aceptaTerminos,
        });
      } else {
        await auth.signIn({ email: email.trim(), password });
      }
    } catch (error) {
      console.warn('LoginViewModel.enviar:', error);
      cambiar({
        error: e.esRegistro
          ? 'No pudimos crear la cuenta. ¿Ese correo ya está registrado?'
          : 'Correo o contraseña incorrectos, o no hay conexión.',
      });
    } finally {
      cambiar({ cargando: false });
    }
  };

  return {
    ...estado,
    /** «Usar cuenta demo» solo se ofrece al entrar, y solo si el flag lo permite. */
    ofreceCuentaDemo: cuentaDemo && !estado.esRegistro,
    alternarModo,
    cambiarAceptaDatos,
    cambiarAceptaTerminos,
    enviar,
  };
}

export type LoginViewModel = ReturnType<typeof useLoginViewModel>;
