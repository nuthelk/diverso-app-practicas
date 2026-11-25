import Logo from '@/shared/ui/Logo';
import Icono from '@/shared/ui/Icono';
import { ICONOS } from '@/shared/ui/iconos';
import { useAuth } from '@/features/auth/model/auth';
import MenuCuenta from '@/features/auth/components/MenuCuenta';

const SECCIONES = [
  { id: 'agencias', etiqueta: 'Agencias', href: '#/admin' },
  { id: 'dispersiones', etiqueta: 'Dispersiones', href: '#/admin/dispersiones' },
] as const;

/**
 * La barra superior de administración, la misma del panel de agencias: marca, pestañas, el «Modo de prueba» (único
 * en las dos pantallas) y el menú de cuenta con el tema y la salida.
 */
export default function AdminCabecera({ activa }: { activa: 'agencias' | 'dispersiones' }) {
  const { email } = useAuth();

  return (
    <>
      <button type="button" className="saltar" onClick={() => document.getElementById('principal')?.focus()}>
        Saltar al contenido
      </button>

      <header className="monte sticky top-0 z-40 flex min-h-[60px] flex-wrap items-center gap-x-3 gap-y-1 bg-bosque px-4 py-2 text-sobre-bosque lg:gap-x-5 lg:px-8">
        <a href="#/admin" className="mr-2 flex min-w-0 items-center gap-2.5 no-underline" aria-label="Diverso, administración, ir a agencias">
          <span className="grid size-[34px] shrink-0 place-items-center rounded-brote bg-bosque-2">
            <Logo size={22} />
          </span>
          <b className="text-destacado">Diverso</b>
          <small className="hidden text-detalle text-sobre-bosque-2 sm:block">Administración</small>
        </a>

        <nav aria-label="Secciones de administración" className="order-last w-full sm:order-none sm:w-auto">
          <ul className="flex items-center gap-0.5">
            {SECCIONES.map((s) => {
              const actual = s.id === activa;
              return (
                <li key={s.id}>
                  <a
                    href={s.href}
                    aria-current={actual ? 'page' : undefined}
                    className={`relative flex min-h-11 items-center rounded-pildora px-3.5 text-cuerpo text-sobre-bosque no-underline transition-colors hover:bg-bosque-2
              ${actual ? 'bg-bosque-2 font-bold after:absolute after:inset-x-4 after:bottom-[3px] after:h-[3px] after:rounded-pildora after:bg-sobre-bosque' : 'font-semibold'}`}
                  >
                    {s.etiqueta}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <p className="prueba" role="status">
            <Icono trazo={ICONOS.info} clase="size-4 max-[380px]:hidden" />
            <span>
              Modo de prueba<span className="max-[1180px]:hidden">: los pagos no mueven dinero real</span>
            </span>
          </p>
          {/* `estado` se pasa siempre: el fragmento conserva esa fila aunque aún no haya correo. */}
          <MenuCuenta titulo="Administración" estado={<>{email}</>} />
        </div>
      </header>
    </>
  );
}
