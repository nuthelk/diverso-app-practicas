import { useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import Logo from '@/shared/ui/Logo';
import Icono from '@/shared/ui/Icono';
import { ICONOS } from '@/shared/ui/iconos';
import Avatar from '@/shared/ui/Avatar';
import StatusPill from '@/shared/ui/StatusPill';
import { TONOS_AVISO } from '@/shared/ui/tonos';
import MenuCuenta from '@/features/auth/components/MenuCuenta';
import { avisoVerificacion } from '../model/verificacion';
import { estadoVigencia } from '../model/agencia';
import { esActiva, SECCIONES } from '../model/navegacion';
import { useAgenciaDelMarco } from '../hooks/useAgenciaDelMarco';
import AvatarAgencia from './AvatarAgencia';

/** El perfil no es una pestaña (esas son el trabajo diario): se abre desde el menú de la cuenta. */
const ENLACES_CUENTA = [{ ruta: '/perfil', texto: 'Perfil de la agencia', icono: ICONOS.edificio }];

/**
 * El marco del panel («Tablero operativo»): una barra superior sobre el monte con la marca, las secciones, el
 * «Modo de prueba» y el menú de cuenta. La misma barra de secciones es la de pestañas en pantallas anchas y la
 * barra inferior en el celular (un solo marcado, sin repetir las secciones).
 */
export default function Shell({ children }: { children: ReactNode }) {
  const path = useLocation().pathname;
  const agencia = useAgenciaDelMarco(path);
  const principal = useRef<HTMLElement>(null);

  /** Aviso principal sobre el estado de la agencia (uno a la vez, el más urgente). */
  const aviso = agencia ? avisoVerificacion(agencia) : null;

  return (
    <>
      <button type="button" className="saltar" onClick={() => principal.current?.focus()}>
        Saltar al contenido
      </button>

      <header className="monte sticky top-0 z-40 flex min-h-[60px] items-center gap-3 bg-bosque px-4 py-2 text-sobre-bosque lg:gap-5 lg:px-8">
        <a href="#/dashboard" className="mr-2 flex min-w-0 items-center gap-2.5 no-underline" aria-label="Diverso, panel de agencias, ir al resumen">
          <span className="grid size-[34px] shrink-0 place-items-center rounded-brote bg-bosque-2">
            <Logo size={22} />
          </span>{' '}
          <b className="text-destacado">Diverso</b>{' '}
          <small className="hidden text-detalle text-sobre-bosque-2 min-[1340px]:block">Panel de agencias</small>
        </a>

        {/* Pestañas desde `lg`; debajo de `lg` la misma lista es la barra inferior, fija sobre la zona segura del teléfono. */}
        <nav
          aria-label="Secciones del panel"
          className="max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:border-t max-lg:border-linea max-lg:bg-superficie
      max-lg:pb-[env(safe-area-inset-bottom)] max-lg:text-tinta-2 max-lg:[--anillo:var(--foco)]"
        >
          <ul className="grid h-[68px] grid-cols-5 lg:flex lg:h-auto lg:items-center lg:gap-0.5">
            {SECCIONES.map((s) => {
              const activa = esActiva(path, s.ruta);
              return (
                <li key={s.ruta} className="lg:contents">
                  <a
                    href={'#' + s.ruta}
                    aria-current={activa ? 'page' : undefined}
                    aria-label={s.corta ? s.etiqueta : undefined}
                    className={`relative flex h-full flex-col items-center gap-[3px] px-0.5 pt-[7px] text-center text-nota leading-[1.1] no-underline
      lg:h-auto lg:min-h-11 lg:flex-row lg:rounded-pildora lg:px-3.5 lg:pt-0 lg:text-cuerpo lg:text-sobre-bosque lg:transition-colors lg:hover:bg-bosque-2
      ${
        activa
          ? 'font-extrabold text-tinta lg:bg-bosque-2 lg:font-bold lg:after:absolute lg:after:inset-x-4 lg:after:bottom-[3px] lg:after:h-[3px] lg:after:rounded-pildora lg:after:bg-sobre-bosque'
          : 'font-semibold'
      }`}
                  >
                    <span className={`grid h-7 w-[50px] place-items-center rounded-pildora lg:hidden ${activa ? 'bg-heliconia text-sobre-heliconia' : ''}`}>
                      <Icono trazo={s.icono} clase="size-5" />
                    </span>{' '}
                    {s.corta ? (
                      <>
                        {/* La etiqueta completa solo cabe desde 1340 px; el nombre accesible es siempre el completo. */}
                        <span aria-hidden="true" className="min-[1340px]:hidden">
                          {s.corta}
                        </span>{' '}
                        <span aria-hidden="true" className="hidden min-[1340px]:inline">
                          {s.etiqueta}
                        </span>
                      </>
                    ) : (
                      s.etiqueta
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <p className="prueba" role="status">
            <Icono trazo={ICONOS.info} clase="size-4 max-[380px]:hidden" />{' '}
            <span>
              Modo de prueba<span className="max-[1180px]:hidden">: los pagos no mueven dinero real</span>
            </span>
          </p>
          <MenuCuenta
            titulo={agencia?.nombre ?? ''}
            enlaces={ENLACES_CUENTA}
            avatar={(tam) =>
              agencia?.logo_url ? (
                <AvatarAgencia agencia={agencia} tam={tam} decorativo />
              ) : (
                <Avatar iniciales={agencia?.nombre ?? ''} tam={tam} />
              )
            }
            // Siempre un nodo, aunque no dibuje nada: el renglón del estado se
            // dibuja también mientras carga la agencia.
            estado={
              <>
                {agencia && (
                  <>
                    {agencia.ciudad}{' '}
                    <StatusPill estado={agencia.estado_verificacion} />
                    {agencia.estado_verificacion === 'verificado' && estadoVigencia(agencia) !== 'vigente' && (
                      <>
                        {' '}
                        <StatusPill estado={estadoVigencia(agencia)} />
                      </>
                    )}
                  </>
                )}
              </>
            }
          />
        </div>
      </header>

      {/* El Resumen muestra estos avisos arriba, con su acción: ahí el banner los repetiría. */}
      {aviso && !esActiva(path, '/dashboard') && (
        <div className={`px-5 py-3 text-cuerpo font-semibold lg:px-8 ${TONOS_AVISO[aviso.tono]}`} role="status">
          {aviso.texto}
        </div>
      )}

      <main id="principal" tabIndex={-1} ref={principal} className="min-w-0 outline-none max-lg:pb-[calc(84px+env(safe-area-inset-bottom))]">
        {children}
      </main>
    </>
  );
}
