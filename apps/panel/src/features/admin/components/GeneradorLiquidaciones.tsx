import type { Dispatch, SetStateAction } from 'react';
import Tarjeta from '@/shared/ui/Tarjeta';
import Campo from '@/shared/ui/Campo';
import { fechaTexto } from '@/shared/lib/format';
import { rangoSemana, semanaTerminada } from '@/features/liquidaciones/model/liquidaciones';

export default function GeneradorLiquidaciones({
  semana,
  setSemana,
  generando,
  ongenerarsemana,
  onanticipos,
}: {
  /** La semana la guarda el padre: el valor y su setter. */
  semana: string;
  setSemana: Dispatch<SetStateAction<string>>;
  generando: boolean;
  ongenerarsemana: () => void;
  onanticipos: () => void;
}) {
  const rango = semana ? rangoSemana(semana) : null;
  const semanaLista = !!semana && semanaTerminada(semana);

  return (
    <Tarjeta
      titulo="Generar a mano"
      descripcion="Elige cualquier día de la semana que quieras liquidar. Solo se liquidan semanas completas."
      clase="mt-6"
    >
      <div className="flex flex-wrap items-end gap-3">
        <Campo
          etiqueta="Semana a liquidar"
          clase="w-full sm:w-56"
          control={(atributos) => (
            <input {...atributos} type="date" className="campo" value={semana} onChange={(e) => setSemana(e.target.value)} />
          )}
        />
        <button className="btn btn-primario" disabled={generando || !semanaLista} onClick={ongenerarsemana}>
          {generando ? 'Generando…' : 'Generar liquidaciones de la semana'}
        </button>
        <button className="btn btn-secundario" disabled={generando} onClick={onanticipos}>
          Generar anticipos ahora
        </button>
      </div>
      {rango && (
        <p className="mt-3 text-detalle text-tinta-2">
          Semana del lunes {fechaTexto(rango.inicio)} al domingo {fechaTexto(rango.fin)}.{' '}
          {!semanaLista && <span className="font-bold text-prueba-ink">Aún no termina: solo se liquidan semanas completas.</span>}
        </p>
      )}
    </Tarjeta>
  );
}
