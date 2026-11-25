import { useId, useRef, useState, type KeyboardEvent } from 'react';
import Chips from '@/shared/ui/Chips';
import Icono from '@/shared/ui/Icono';
import { ICONOS } from '@/shared/ui/iconos';
import { useTrasDibujar } from '@/shared/lib/useTrasDibujar';
import { fechaBogota } from '@/features/planes/model/plan';
import { elegirDia, estadoCalendario, mesParaCalendario, moverFoco, type ActividadPorDia, type Nivel } from '../model/calendario';
import { inicioDeMes, sumarMeses } from '../model/fechas';
import {
  esPeriodoInicial,
  PREDEFINIDOS,
  periodoDeSemana,
  periodoInicial,
  periodoPredefinido,
  type Periodo,
  type Predefinido,
} from '../model/periodo';

const DIAS = [
  ['L', 'lunes'],
  ['M', 'martes'],
  ['M', 'miércoles'],
  ['J', 'jueves'],
  ['V', 'viernes'],
  ['S', 'sábado'],
  ['D', 'domingo'],
];
/** Cada nivel pinta su insignia: el relleno crece con los viajeros. */
const NIVELES: Record<Nivel, string> = {
  0: 'border-contorno text-tinta-2',
  1: 'border-helecho text-tinta',
  2: 'border-helecho bg-helecho/30 text-tinta',
  3: 'border-helecho bg-helecho text-sobre-helecho',
};
const FILA = 'grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] gap-0.5 sm:grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]';
const LEYENDA = [
  [1, '1–9'],
  [2, '10–19'],
  [3, '20 o más'],
] as const;

const numero = (d: { hoy: boolean; extremo: boolean; delMes: boolean }) =>
  d.hoy ? 'bg-heliconia font-bold text-sobre-heliconia' : d.extremo ? 'font-semibold text-sobre-bosque' : d.delMes ? 'font-semibold' : 'text-tinta-3';

/**
 * El calendario del filtro de fecha: un mes en cuadrícula con los viajeros de cada día (3 niveles) y el total de cada
 * semana, para ver dónde hay actividad. Elige un atajo, un día, una semana o un rango; quien lo muestra recibe el período
 * y lo cierra. Teclado: flechas por días y semanas, Inicio/Fin al lunes/domingo, Re Pág/Av Pág por meses.
 */
export default function CalendarioActividad({
  periodo,
  actividad,
  hoy,
  onelegir,
}: {
  periodo: Periodo;
  actividad: ActividadPorDia;
  hoy: Date;
  onelegir: (periodo: Periodo) => void;
}) {
  const uid = useId();
  // Al abrir, el mes y el día con foco son los del período; después se mueven con los botones y el teclado.
  const [vista, setVista] = useState(() => inicioDeMes(periodo.desde));
  const [foco, setFoco] = useState(() => periodo.desde);
  const [modoRango, setModoRango] = useState(false);
  const [ancla, setAncla] = useState<string | null>(null);
  const cuadricula = useRef<HTMLDivElement>(null);
  const trasDibujar = useTrasDibujar();

  const mes = mesParaCalendario(actividad, vista, hoy, ancla ? { desde: ancla, hasta: ancla } : periodo);
  const estado = estadoCalendario({ modoRango, ancla, periodo, actividad, hoy });
  const sinFiltro = esPeriodoInicial(periodo);
  const numeroDeHoy = Number(fechaBogota(hoy).slice(8));

  function elegir(dia: string) {
    setFoco(dia);
    const r = elegirDia(modoRango, ancla, dia);
    setAncla(r.ancla);
    if (r.periodo) {
      setModoRango(false);
      onelegir(r.periodo);
    }
  }

  function cambiarMes(meses: number) {
    const nueva = inicioDeMes(sumarMeses(vista, meses));
    setVista(nueva);
    setFoco(nueva);
  }

  function alTeclear(e: KeyboardEvent, dia: string) {
    const destino = moverFoco(dia, e.key);
    if (!destino) return;
    e.preventDefault();
    setFoco(destino);
    setVista(inicioDeMes(destino));
    // El día se enfoca ya dibujado (puede ser de otro mes, que recién aparece).
    trasDibujar(() => cuadricula.current?.querySelector<HTMLElement>(`[data-dia="${destino}"]`)?.focus());
  }

  function quitar() {
    if (!sinFiltro) onelegir(periodoInicial(hoy));
  }

  return (
    <>
      <Chips
        etiqueta="Períodos rápidos"
        opciones={PREDEFINIDOS.map((p) => ({ valor: p.clave, etiqueta: p.texto }))}
        valor={periodo.clave}
        onchange={(clave) => onelegir(periodoPredefinido(clave as Predefinido, hoy))}
      />

      <div className="mt-4 mb-2 flex items-center justify-between gap-2">
        <button type="button" className="boton-icono" aria-label="Mes anterior" onClick={() => cambiarMes(-1)}>
          <Icono trazo={ICONOS.chevron} clase="size-5 rotate-90" />
        </button>
        <h3 id={`${uid}-mes`} className="text-center text-destacado" aria-live="polite">
          {mes.titulo}
        </h3>
        <button type="button" className="boton-icono" aria-label="Mes siguiente" onClick={() => cambiarMes(1)}>
          <Icono trazo={ICONOS.chevron} clase="size-5 -rotate-90" />
        </button>
      </div>

      <div role="grid" aria-labelledby={`${uid}-mes`} className="grid gap-0.5" ref={cuadricula}>
        <div role="row" className={FILA}>
          <span role="columnheader" className="px-0.5 py-0.5 text-center text-nota font-bold text-tinta-2">
            Semana
          </span>
          {DIAS.map(([inicial, nombre]) => (
            <span key={nombre} role="columnheader" aria-label={nombre} className="px-0.5 py-0.5 text-center text-nota font-bold text-tinta-2">
              {inicial}
            </span>
          ))}
        </div>

        {mes.semanas.map((s) => (
          <div key={s.lunes} role="row" className={FILA}>
            <div role="rowheader">
              <button
                type="button"
                data-semana={s.lunes}
                aria-pressed={s.seleccionada}
                aria-label={s.etiqueta}
                className={`flex min-h-14 w-full flex-col items-center justify-center rounded-campo border p-0.5 hover:border-contorno ${
                  s.seleccionada
                    ? 'border-bosque bg-bosque text-sobre-bosque'
                    : s.salidas > 0
                      ? 'border-linea bg-niebla-2 text-tinta'
                      : 'border-transparent text-tinta'
                }`}
                onClick={() => onelegir(periodoDeSemana(s.lunes))}
              >
                {s.salidas > 0 ? (
                  <>
                    <b className="cifra text-cuerpo leading-tight" data-total="">
                      {s.viajeros}
                    </b>{' '}
                    <small className={`text-nota ${s.seleccionada ? 'text-sobre-bosque-2' : 'text-tinta-2'}`}>viaj.</small>
                  </>
                ) : (
                  <b className="font-normal text-tinta-3" aria-hidden="true">
                    —
                  </b>
                )}
              </button>
            </div>
            {s.dias.map((d) => (
              <div key={d.fecha} role="gridcell">
                <button
                  type="button"
                  data-dia={d.fecha}
                  data-autofocus={d.fecha === foco ? '' : undefined}
                  data-extremo={d.extremo ? '' : undefined}
                  aria-pressed={d.seleccionado}
                  aria-label={d.etiqueta}
                  tabIndex={d.fecha === foco ? 0 : -1}
                  className={`flex min-h-14 w-full flex-col items-center justify-start gap-0.5 rounded-campo border py-0.5 outline-offset-1 hover:border-contorno ${
                    d.extremo
                      ? 'border-bosque bg-bosque text-sobre-bosque'
                      : d.seleccionado
                        ? 'border-contorno bg-helecho/15 text-tinta'
                        : 'border-transparent text-tinta hover:bg-niebla-2'
                  }`}
                  onClick={() => elegir(d.fecha)}
                  onKeyDown={(e) => alTeclear(e, d.fecha)}
                >
                  <span className={`cifra grid h-6 min-w-6 place-items-center rounded-full text-detalle leading-none ${numero(d)}`}>{d.numero}</span>
                  {d.salidas > 0 && (
                    <>
                      {' '}
                      <span
                        data-viajeros=""
                        data-nivel={d.nivel}
                        className={`cifra inline-grid h-5 min-w-7 place-items-center rounded-full border-2 px-1.5 text-nota leading-none font-bold ${
                          d.extremo ? 'border-sobre-bosque bg-sobre-bosque text-bosque' : NIVELES[d.nivel]
                        }`}
                      >
                        {d.viajeros}
                      </span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-1.5 text-detalle text-tinta-2" data-leyenda="">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span>Viajeros por día:</span>
          {LEYENDA.map(([nivel, rango]) => (
            <span
              key={nivel}
              className={`cifra inline-grid h-5 min-w-7 place-items-center rounded-full border-2 px-1.5 text-nota leading-none font-bold ${NIVELES[nivel]}`}
            >
              {rango}
            </span>
          ))}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="cifra grid size-6 place-items-center rounded-full bg-heliconia text-nota font-bold text-sobre-heliconia" aria-hidden="true">
            {numeroDeHoy}
          </span>
          <span>Hoy</span>
          <span aria-hidden="true" className="opacity-50">
            ·
          </span>
          <span className="inline-block h-4 w-6 rounded-hoja-chica border border-linea bg-niebla-2" aria-hidden="true"></span>
          <span>Semana con salidas: total de viajeros</span>
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="chip"
          aria-pressed={modoRango}
          onClick={() => {
            setModoRango(!modoRango);
            setAncla(null);
          }}
        >
          <Icono trazo={ICONOS.calendario} clase="size-4" />
          Elegir un rango de días
        </button>
        <button
          type="button"
          className="btn btn-texto"
          aria-disabled={sinFiltro ? 'true' : undefined}
          title={sinFiltro ? 'No hay un filtro de fecha activo' : undefined}
          onClick={quitar}
        >
          Quitar filtro
        </button>
      </div>

      <p className="mt-3 min-h-11 border-t border-linea pt-3 text-detalle text-tinta-2" role="status" data-estado="">
        {estado.titulo && (
          <>
            <b className="block text-tinta">{estado.titulo}</b>{' '}
          </>
        )}
        {estado.texto}
      </p>
    </>
  );
}
