import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';

/**
 * Estado de un view model de esta funcionalidad (el `ChangeNotifier` + `NotificaSiVive` de
 * Flutter):
 * - `actual`: la verdad, que leen los comandos (un doble toque con el cierre de un render anterior
 *   ve que ya está procesando).
 * - `cambiar(c)`: actualiza y repinta (`notificar()`); `cambiar(c, false)` solo actualiza (los
 *   campos que Dart asigna sin notificar dentro de un comando).
 * - `vivo`: false tras desmontar (`desechado`): los bucles largos (sondeo del pago) se cortan y no
 *   se repinta nada.
 */
export function useEstadoVivo<T extends object>(inicial: () => T) {
  const [estado, setEstado] = useState<T>(inicial);
  const actual = useRef<T>(estado);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const cambiar = useCallback((cambios: Partial<T>, notificar = true) => {
    actual.current = { ...actual.current, ...cambios };
    if (notificar && vivo.current) setEstado(actual.current);
  }, []);

  const notificar = useCallback(() => {
    if (vivo.current) setEstado(actual.current);
  }, []);

  return { estado, actual: actual as MutableRefObject<T>, cambiar, notificar, vivo };
}
