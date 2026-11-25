import { useState, type Dispatch, type SetStateAction } from 'react';
import Icono from '@/shared/ui/Icono';
import { ICONOS } from '@/shared/ui/iconos';
import { agregarFoto } from '../../model/plan';

/** Fotos del plan como URLs: chips con las ya cargadas y un campo para sumar otra. */
export default function FotosPlan({ fotos, setFotos }: { fotos: string[]; setFotos: Dispatch<SetStateAction<string[]>> }) {
  const [nuevaFoto, setNuevaFoto] = useState('');

  function agregar() {
    const lista = agregarFoto(fotos, nuevaFoto);
    if (lista) {
      setFotos(lista);
      setNuevaFoto('');
    }
  }

  return (
    <>
      {fotos.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {fotos.map((f, i) => (
            <li
              key={f}
              className="inline-flex max-w-full items-center gap-1 rounded-pildora bg-relleno py-1 pr-1.5 pl-3.5 text-detalle text-tinta sm:max-w-[320px]"
            >
              <span className="truncate">{f}</span>
              <button
                type="button"
                className="grid size-7 shrink-0 place-items-center rounded-pildora hover:bg-heliconia-bg hover:text-heliconia"
                aria-label={`Quitar foto ${i + 1}`}
                onClick={() => setFotos((fotos) => fotos.filter((_, j) => j !== i))}
              >
                <Icono trazo={ICONOS.cerrar} clase="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          value={nuevaFoto}
          onChange={(e) => setNuevaFoto(e.target.value)}
          className="campo"
          placeholder="URL de foto (https://…)"
          aria-label="URL de una foto del plan"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              agregar();
            }
          }}
        />
        <button type="button" className="boton-icono" aria-label="Agregar foto" onClick={agregar}>
          <Icono trazo={ICONOS.mas} clase="size-4" />
        </button>
      </div>
    </>
  );
}
