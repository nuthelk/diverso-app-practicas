import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';

/**
 * Estado de un view model de esta funcionalidad (el `ChangeNotifier` + `NotificaSiVive` de
 * Flutter):
 * - `latest`: la verdad, que leen los comandos (un doble toque con el cierre de un render anterior
 *   ve que ya está procesando).
 * - `update(c)`: actualiza y repinta (`notify()`); `update(c, false)` solo actualiza (los
 *   campos que Dart asigna sin notificar dentro de un comando).
 * - `alive`: false tras desmontar (`desechado`): los bucles largos (sondeo del pago) se cortan y no
 *   se repinta nada.
 */
export function useLiveState<T extends object>(initial: () => T) {
  const [state, setState] = useState<T>(initial);
  const latest = useRef<T>(state);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const update = useCallback((changes: Partial<T>, notify = true) => {
    latest.current = { ...latest.current, ...changes };
    if (notify && alive.current) setState(latest.current);
  }, []);

  const notify = useCallback(() => {
    if (alive.current) setState(latest.current);
  }, []);

  return { state, latest: latest as MutableRefObject<T>, update, notify, alive };
}
