import { useRef, useState } from 'react';
import Dialogo from '@/shared/ui/Dialogo';
import Icono from '@/shared/ui/Icono';
import Spinner from '@/shared/ui/Spinner';
import { ICONOS } from '@/shared/ui/iconos';
import { useTrasDibujar } from '@/shared/lib/useTrasDibujar';
import type { ActividadPorDia } from '../model/calendario';
import { esPeriodoInicial, periodoInicial, textoChip, type Periodo } from '../model/periodo';
import CalendarioActividad from './CalendarioActividad';

/**
 * El filtro de fecha de la cabecera: un botón con el ícono de calendario y el período (abre el calendario) y, si hay un
 * filtro, una equis que lo quita. El calendario es un diálogo (hoja inferior en el celular): el foco entra en él y,
 * al cerrar con Escape o al elegir, vuelve al botón.
 */
export default function PeriodoSelector({
  periodo,
  actividad,
  hoy,
  cargando,
  onelegir,
}: {
  periodo: Periodo;
  actividad: ActividadPorDia;
  hoy: Date;
  /** Se están trayendo las cifras del período elegido: el chevron pasa a ser un indicador de carga. */
  cargando: boolean;
  onelegir: (periodo: Periodo) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const trasDibujar = useTrasDibujar();

  const texto = textoChip(periodo, hoy);
  const conFiltro = !esPeriodoInicial(periodo);

  /** Cierra el calendario y devuelve el foco al botón (el navegador no siempre se lo da al hacer clic: Safari). */
  function cerrar() {
    setAbierto(false);
    trasDibujar(() => boton.current?.focus());
  }

  function elegir(p: Periodo) {
    cerrar();
    onelegir(p);
  }

  function quitar() {
    onelegir(periodoInicial(hoy));
    trasDibujar(() => boton.current?.focus());
  }

  return (
    <>
      <div
        className={`inline-flex max-w-full items-center rounded-pildora border ${
          conFiltro ? 'border-helecho bg-helecho/10' : 'border-contorno bg-superficie'
        }`}
        data-periodo=""
      >
        <button
          type="button"
          ref={boton}
          className="inline-flex min-h-11 min-w-0 items-center gap-2 rounded-pildora pr-3.5 pl-4 font-bold hover:bg-niebla-2"
          aria-haspopup="dialog"
          aria-expanded={abierto}
          aria-label={`Filtrar por fecha. Período actual: ${texto}`}
          onClick={() => setAbierto(true)}
        >
          <Icono trazo={ICONOS.calendario} clase="size-5" />
          <span className="max-w-56 truncate sm:max-w-none">{texto}</span>
          {cargando ? <Spinner clase="size-4 motion-reduce:animate-none" /> : <Icono trazo={ICONOS.chevron} clase="size-4" />}
        </button>
        {conFiltro && (
          <button
            type="button"
            className="mr-0.5 grid size-10 shrink-0 place-items-center rounded-full hover:bg-niebla-2"
            aria-label="Quitar el filtro de fecha"
            onClick={quitar}
          >
            <Icono trazo={ICONOS.cerrar} clase="size-4" />
          </button>
        )}
      </div>

      <Dialogo
        abierto={abierto}
        titulo="Filtrar por fecha"
        descripcion="Elige un día, una semana o un rango: se filtran las salidas y las cifras."
        oncerrar={cerrar}
      >
        <CalendarioActividad periodo={periodo} actividad={actividad} hoy={hoy} onelegir={elegir} />
      </Dialogo>
    </>
  );
}
