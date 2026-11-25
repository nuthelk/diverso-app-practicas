import { useCallback, useEffect, useState } from 'react';

/**
 * `trasDibujar(fn)` corre `fn` cuando React ya dibujó los cambios de estado pedidos en el mismo evento: enfocar un
 * botón que recién aparece, el primer campo inválido, la fila o el ítem que se acaba de mostrar.
 * Cada pedido es un objeto nuevo: siempre provoca un dibujo, aunque el resto del estado no cambie.
 * `fn` corre una vez, con lo que vio al pedirse: debe leer el DOM por refs, no estado del componente.
 */
export function useTrasDibujar(): (fn: () => void) => void {
  const [pendiente, setPendiente] = useState<{ fn: () => void } | null>(null);
  useEffect(() => {
    pendiente?.fn();
  }, [pendiente]);
  return useCallback((fn: () => void) => setPendiente({ fn }), []);
}
