import Icono from '@/shared/ui/Icono';
import { ICONOS, type NombreIcono } from '@/shared/ui/iconos';
import type { AvisoResumen } from '../model/resumen';

const ICONO: Record<AvisoResumen['clave'], NombreIcono> = {
  verificacion: 'escudo',
  rnt: 'documento',
  salidas: 'calendario',
  cuenta: 'banco',
};

/** «Por resolver»: lo que pide una acción de la agencia, lo urgente primero; sin nada pendiente, una línea tranquila. */
export default function PorResolver({ avisos }: { avisos: AvisoResumen[] }) {
  return (
    <section className="tarjeta mt-5 overflow-hidden" aria-labelledby="h-avisos">
      <h2 id="h-avisos" className="flex items-center gap-2 border-b border-linea bg-niebla-2 px-4 py-2.5 text-cuerpo">
        Por resolver
        {avisos.length > 0 && (
          <>
            {' '}
            <span
              className="cifra inline-grid h-6 min-w-6 place-items-center rounded-full bg-heliconia px-1.5 text-detalle leading-none font-bold text-sobre-heliconia"
              data-cuenta=""
              aria-hidden="true"
            >
              {avisos.length}
            </span>{' '}
            <span className="sr-only">
              ({avisos.length} {avisos.length === 1 ? 'aviso' : 'avisos'})
            </span>
          </>
        )}
      </h2>

      {avisos.length === 0 ? (
        <p className="flex items-center gap-2 px-4 py-3 text-tinta-2" data-al-dia="">
          <Icono trazo={ICONOS.check} clase="size-5 text-helecho" />
          Todo al día
        </p>
      ) : (
        <ul>
          {avisos.map((a) => (
            <li
              key={a.clave}
              data-aviso={a.clave}
              className={`grid grid-cols-[auto_1fr] items-center gap-x-3.5 gap-y-1.5 border-t border-linea px-4 py-2.5 first:border-t-0 sm:grid-cols-[auto_1fr_auto] ${
                a.urgente ? 'bg-heliconia-bg' : ''
              }`}
            >
              <span className={`grid size-9 place-items-center rounded-campo ${a.urgente ? 'bg-heliconia text-sobre-heliconia' : 'bg-niebla-2 text-helecho'}`}>
                <Icono trazo={ICONOS[ICONO[a.clave]]} clase="size-5" />
              </span>
              <p className="font-semibold">
                <span className={`etiqueta-seccion mr-1.5 ${a.urgente ? 'text-heliconia' : ''}`}>{a.etiqueta}</span>
                {a.texto}
              </p>
              {a.accion && (
                <a
                  className={`btn btn-chico col-span-full sm:col-span-1 ${a.urgente ? 'btn-urgente' : 'btn-primario'}`}
                  href={'ruta' in a.accion ? '#' + a.accion.ruta : a.accion.url}
                  target={'url' in a.accion ? '_blank' : undefined}
                  rel={'url' in a.accion ? 'noopener noreferrer' : undefined}
                >
                  {a.accion.texto}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
