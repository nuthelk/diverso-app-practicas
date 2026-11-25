import { useEffect, useId, useRef, useState, type FocusEvent, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import Avatar from '@/shared/ui/Avatar';
import Icono from '@/shared/ui/Icono';
import Segmentado from '@/shared/ui/Segmentado';
import { ICONOS } from '@/shared/ui/iconos';
import { elegirTema, useTema, type Preferencia } from '@/shared/lib/tema';
import { useCerrarSesion } from '../hooks/useCerrarSesion';

const TEMAS = [
  { valor: 'sistema', etiqueta: 'Sistema', icono: ICONOS.monitor },
  { valor: 'claro', etiqueta: 'Claro', icono: ICONOS.sol },
  { valor: 'oscuro', etiqueta: 'Oscuro', icono: ICONOS.luna },
];

const ITEM =
  'flex min-h-11 w-full items-center gap-3 rounded-campo px-3 text-left text-cuerpo font-semibold text-tinta transition-colors hover:bg-niebla-2';

/**
 * El menú de la cuenta, único en todo el panel: quién eres (título y estado), Términos y privacidad, el tema
 * (Sistema / Claro / Oscuro, el ÚNICO control de tema) y Cerrar sesión. No lista las secciones del panel; solo los
 * `enlaces` propios de la cuenta que le pase quien lo usa (el perfil de la agencia).
 * Se adapta al fondo: sobre el monte (`.monte`) el botón es de contorno claro.
 */
export default function MenuCuenta({
  titulo,
  estado,
  avatar,
  enlaces = [],
}: {
  /** Nombre de la cuenta (la agencia); vacío mientras carga. */
  titulo: string;
  /** Ciudad, verificación… bajo el título dentro del menú. */
  estado?: ReactNode;
  /** Imagen de la cuenta en el tamaño (px) que pida; por defecto las iniciales del título. */
  avatar?: (tam: number) => ReactNode;
  /** Páginas de la cuenta (`ruta` del panel, sin `#`) que van arriba de Términos; la ruta actual lleva `aria-current`. */
  enlaces?: { ruta: string; texto: string; icono: string }[];
}) {
  const uid = useId();
  const idPanel = `${uid}-panel`;
  const idTema = `${uid}-tema`;

  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  // Los oyentes de la ventana se registran una vez: leen si está abierto en el momento del evento.
  const abiertoRef = useRef(abierto);
  abiertoRef.current = abierto;

  const { preferencia } = useTema();
  const cerrarSesion = useCerrarSesion();
  const ruta = useLocation().pathname;

  // Al navegar se cierra (el menú no sigue abierto sobre la sección nueva).
  useEffect(() => {
    setAbierto(false);
  }, [ruta]);

  // Al abrir, el foco entra por su primer control (el efecto corre cuando el panel ya está dibujado).
  useEffect(() => {
    if (abierto) panel.current?.querySelector<HTMLElement>('a[href], button')?.focus();
  }, [abierto]);

  function abrir() {
    setAbierto(true);
  }

  function cerrar(devolverFoco = false) {
    setAbierto(false);
    if (devolverFoco) boton.current?.focus();
  }

  // Oyentes en `window`: Escape cierra y un clic fuera también.
  useEffect(() => {
    function alTeclear(e: KeyboardEvent) {
      if (e.key === 'Escape' && abiertoRef.current) {
        setAbierto(false);
        boton.current?.focus();
      }
    }
    function alHacerClic(e: MouseEvent) {
      if (abiertoRef.current && !raiz.current?.contains(e.target as Node)) setAbierto(false);
    }
    window.addEventListener('keydown', alTeclear);
    window.addEventListener('click', alHacerClic);
    return () => {
      window.removeEventListener('keydown', alTeclear);
      window.removeEventListener('click', alHacerClic);
    };
  }, []);

  function alPerderFoco(e: FocusEvent) {
    const destino = e.relatedTarget as Node | null;
    if (abierto && destino && !raiz.current?.contains(destino)) cerrar();
  }

  return (
    <div className="relative" ref={raiz} onBlur={alPerderFoco}>
      <button
        type="button"
        ref={boton}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-pildora border border-contorno bg-superficie py-1 pr-2.5 pl-1.5 text-tinta
      transition-colors hover:bg-niebla-2 in-[.monte]:border-sobre-bosque-2 in-[.monte]:bg-transparent in-[.monte]:text-sobre-bosque
      in-[.monte]:hover:bg-bosque-2"
        aria-label={titulo ? `Cuenta de ${titulo}` : 'Cuenta'}
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={() => (abierto ? cerrar() : abrir())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !abierto) {
            e.preventDefault();
            abrir();
          }
        }}
      >
        {avatar ? avatar(32) : <Avatar iniciales={titulo} tam={32} />}
        <Icono trazo={ICONOS.chevron} clase={`size-4 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      <div
        id={idPanel}
        ref={panel}
        hidden={!abierto}
        role="group"
        aria-label="Cuenta"
        className="aparecer absolute top-[calc(100%+8px)] right-0 z-[60] w-[292px] max-w-[calc(100vw-24px)] rounded-hoja border border-linea
      bg-superficie p-2 text-tinta shadow-[0_18px_40px_-12px_rgb(0_0_0/0.35)] [--anillo:var(--foco)]"
      >
        <div className="mb-1.5 flex items-center gap-3 border-b border-linea px-2 pt-2 pb-3">
          {avatar ? avatar(42) : <Avatar iniciales={titulo} tam={42} />}
          <div className="min-w-0">
            <p className="font-bold leading-tight [overflow-wrap:anywhere]">{titulo}</p>
            {estado != null && estado !== false && (
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-detalle text-tinta-2">{estado}</div>
            )}
          </div>
        </div>

        {enlaces.map((e) => (
          <a key={e.ruta} href={'#' + e.ruta} className={ITEM} aria-current={ruta === e.ruta ? 'page' : undefined}>
            <Icono trazo={e.icono} />
            {e.texto}
          </a>
        ))}

        <a href="#/legal/terminos-agencias" className={ITEM}>
          <Icono trazo={ICONOS.documento} />
          Términos y privacidad
        </a>

        <div className="px-2 pt-2 pb-2.5">
          <span id={idTema} className="mb-1.5 block text-detalle font-bold text-tinta-2">
            Tema
          </span>
          <Segmentado opciones={TEMAS} valor={preferencia} etiquetadoPor={idTema} onchange={(v) => elegirTema(v as Preferencia)} />
        </div>

        <div className="mt-1 border-t border-linea pt-1.5">
          <button
            type="button"
            className={ITEM}
            onClick={() => {
              cerrar();
              cerrarSesion();
            }}
          >
            <Icono trazo={ICONOS.salir} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
