import type { Dispatch, SetStateAction } from 'react';
import Campo from '@/shared/ui/Campo';
import Select from '@/shared/ui/Select';
import { CATEGORIAS, type CategoriaValor, type PlanDraft } from '../../model/plan';
import { componerDuracion, opcionesUnidad, type Unidad } from '../../model/duracion';
import { numeroDe } from '../numero';
import Seccion from './Seccion';

/** Título, destino, categoría, precio y duración (cantidad + unidad → `duracionTexto`). `data-campo` deja que el resumen de errores lleve el foco al campo. */
export default function SeccionEsencial({
  d,
  setD,
  duracionCantidad,
  setDuracionCantidad,
  duracionUnidad,
  setDuracionUnidad,
  errorPrecio,
}: {
  d: PlanDraft;
  setD: Dispatch<SetStateAction<PlanDraft>>;
  duracionCantidad: number | null;
  setDuracionCantidad: Dispatch<SetStateAction<number | null>>;
  duracionUnidad: Unidad;
  setDuracionUnidad: Dispatch<SetStateAction<Unidad>>;
  /** Por qué el precio no sirve; solo se pasa tras intentar guardar. */
  errorPrecio?: string;
}) {
  const unidadesOpciones = opcionesUnidad(duracionCantidad);

  /** Compone `duracionTexto` con la cantidad y la unidad recién elegidas (no con las props, que aún no cambiaron). */
  function componer(cantidad: number | null, unidad: Unidad) {
    const duracionTexto = componerDuracion(cantidad, unidad);
    setD((d) => ({ ...d, duracionTexto }));
  }

  return (
    <Seccion titulo="Lo esencial">
      <div className="space-y-3">
        <Campo
          etiqueta="Título del plan *"
          control={(atributos) => (
            <input
              {...atributos}
              data-campo="titulo"
              required
              value={d.titulo}
              onChange={(e) => {
                const titulo = e.target.value;
                setD((d) => ({ ...d, titulo }));
              }}
              className="campo"
            />
          )}
        />
        <div className="grid gap-3 min-[640px]:grid-cols-4">
          <Campo
            etiqueta="Destino *"
            control={(atributos) => (
              <input
                {...atributos}
                data-campo="destino"
                required
                value={d.destino}
                onChange={(e) => {
                  const destino = e.target.value;
                  setD((d) => ({ ...d, destino }));
                }}
                className="campo"
              />
            )}
          />
          <div>
            <span className="etiqueta-campo" aria-hidden="true">
              Categoría
            </span>
            <Select
              etiqueta="Categoría"
              opciones={CATEGORIAS.map((c) => ({ valor: c.valor, etiqueta: c.label }))}
              valor={d.categoria}
              onchange={(v) => setD((d) => ({ ...d, categoria: v as CategoriaValor }))}
            />
          </div>
          <Campo
            etiqueta="Precio final COP *"
            ayuda="Es el precio final: lo que ve el viajero es lo que paga, sin cargos ocultos."
            error={errorPrecio}
            control={(atributos) => (
              <input
                {...atributos}
                data-campo="precio"
                type="number"
                min="1"
                required
                value={d.precioCop ?? ''}
                onChange={(e) => {
                  // Vacío queda en null: `errorPrecio` lo rechaza al guardar.
                  const precioCop = numeroDe(e.target.value) as number;
                  setD((d) => ({ ...d, precioCop }));
                }}
                className="campo cifra"
                placeholder="150000"
              />
            )}
          />
          <div role="group" aria-labelledby="duracion-etiqueta">
            <span className="etiqueta-campo" id="duracion-etiqueta">
              Duración *
            </span>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                required
                aria-label="Cantidad de la duración"
                value={duracionCantidad ?? ''}
                onChange={(e) => {
                  const cantidad = numeroDe(e.target.value);
                  setDuracionCantidad(cantidad);
                  componer(cantidad, duracionUnidad);
                }}
                className="campo cifra w-20 shrink-0 text-center"
              />
              <Select
                clase="flex-1"
                etiqueta="Unidad de la duración"
                opciones={unidadesOpciones}
                valor={duracionUnidad}
                onchange={(v) => {
                  const unidad = v as Unidad;
                  setDuracionUnidad(unidad);
                  componer(duracionCantidad, unidad);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </Seccion>
  );
}
