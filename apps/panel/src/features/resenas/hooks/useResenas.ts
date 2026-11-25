import { useEffect, useRef, useState } from 'react';
import { mensajeError } from '@/shared/api/errores';
import { useTrasDibujar } from '@/shared/lib/useTrasDibujar';
import { resenasAgencia } from '../api/resenas.api';
import { TAMANO_PAGINA, type ResenaAgencia } from '../model/resenas';

/**
 * Todas las reseñas de los planes de la agencia, la más nueva primero, de a 20 con «Cargar más».
 * Devuelve también la `lista` (ref del `<ul>`): tras «Cargar más» el foco va a la primera reseña nueva.
 */
export function useResenas() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [resenas, setResenas] = useState<ResenaAgencia[]>([]);
  /** Una página corta es la última: no hay más que pedir. */
  const [hayMas, setHayMas] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [errorMas, setErrorMas] = useState('');
  /** Filas que ya trajo el servidor (no las de la lista: las repetidas se descartan) = desde dónde pide la siguiente página. */
  const pedidas = useRef(0);
  /** Evita pedir dos veces la misma página aunque el estado todavía no se haya vuelto a dibujar. */
  const ocupado = useRef(false);
  const lista = useRef<HTMLUListElement>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    // Si el efecto se repite (Reintentar o el doble montaje de StrictMode) la respuesta vieja se ignora.
    let vigente = true;
    setCargando(true);
    setError('');
    resenasAgencia({ limite: TAMANO_PAGINA, desde: 0 })
      .then((pagina) => {
        if (!vigente) return;
        setResenas(pagina);
        pedidas.current = pagina.length;
        setHayMas(pagina.length === TAMANO_PAGINA);
      })
      .catch((e) => {
        if (vigente) setError(mensajeError(e));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [intento]);

  const trasDibujar = useTrasDibujar();

  /** El foco va a la primera reseña nueva: quien usa teclado sigue leyendo ahí, aunque el botón desaparezca. */
  function enfocarDesde(indice: number) {
    const ul = lista.current;
    if (!ul) return;
    const item = ul.children[Math.min(indice, ul.children.length - 1)] as HTMLElement | undefined;
    if (!item) return;
    item.tabIndex = -1;
    item.focus();
  }

  /** Agrega la siguiente página sin tocar lo ya cargado; si falla, lo cargado se queda y se puede reintentar. */
  async function cargarMas() {
    if (ocupado.current) return;
    ocupado.current = true;
    setCargandoMas(true);
    setErrorMas('');
    try {
      const pagina = await resenasAgencia({ limite: TAMANO_PAGINA, desde: pedidas.current });
      // Si llegó una reseña nueva entre dos páginas, todo se corre una fila: la última de antes vuelve a venir.
      const vistas = new Set(resenas.map((r) => r.id));
      const antes = resenas.length;
      setResenas([...resenas, ...pagina.filter((r) => !vistas.has(r.id))]);
      pedidas.current += pagina.length;
      setHayMas(pagina.length === TAMANO_PAGINA);
      trasDibujar(() => enfocarDesde(antes));
    } catch (e) {
      setErrorMas(mensajeError(e));
    } finally {
      ocupado.current = false;
      setCargandoMas(false);
    }
  }

  return {
    cargando,
    error,
    resenas,
    hayMas,
    cargandoMas,
    errorMas,
    lista,
    recargar: () => setIntento((n) => n + 1),
    cargarMas,
  };
}
