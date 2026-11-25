import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';

/**
 * Anunciador de rutas para lectores de pantalla. Replica el `#svelte-announcer` que SvelteKit monta de serie y que
 * React Router no trae: sin él, quien usa lector de pantalla no se entera de que cambió de página al navegar en el
 * cliente (no hay recarga que lo anuncie).
 *
 * Igual que en SvelteKit: en la primera carga queda vacío (el lector ya lee la página nueva) y, tras cada navegación
 * (cambio de `pathname`), anuncia el título del documento, o «untitled page» si no hay título. Va oculto a la vista
 * con el mismo estilo en línea que el original.
 */
export default function AnunciadorRuta() {
  const { pathname } = useLocation();
  const [anuncio, setAnuncio] = useState('');
  const rutaAnterior = useRef(pathname);

  useEffect(() => {
    // En la primera carga (y si el efecto se repite sin cambiar de ruta, como en StrictMode) no se anuncia nada.
    if (pathname === rutaAnterior.current) return;
    rutaAnterior.current = pathname;
    setAnuncio(document.title || 'untitled page');
  }, [pathname]);

  return (
    <div
      id="anunciador-ruta"
      aria-live="assertive"
      aria-atomic="true"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        clip: 'rect(0 0 0 0)',
        clipPath: 'inset(50%)',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        width: '1px',
        height: '1px',
      }}
    >
      {anuncio}
    </div>
  );
}
