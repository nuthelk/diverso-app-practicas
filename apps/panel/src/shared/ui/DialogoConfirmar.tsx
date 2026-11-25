import Dialogo from './Dialogo';
import { responder, usePendiente, type Pregunta } from '@/shared/lib/confirmar';

/** Un número por pregunta: la `key` que rehace el diálogo cuando una pregunta nueva reemplaza a otra. */
const ids = new WeakMap<Pregunta, number>();
let siguiente = 0;
const idDe = (p: Pregunta) => {
  if (!ids.has(p)) ids.set(p, ++siguiente);
  return ids.get(p)!;
};

/** Se monta una vez en el layout raíz y dibuja la pregunta de `confirmar()` mientras haya una pendiente. */
export default function DialogoConfirmar() {
  const { pregunta: p } = usePendiente();
  if (!p) return null;
  return (
    <Dialogo
      key={idDe(p)}
      abierto
      rol="alertdialog"
      titulo={p.titulo}
      descripcion={p.mensaje}
      oncerrar={() => responder(false)}
      pie={
        <>
          <button
            type="button"
            className="btn btn-secundario"
            data-autofocus={p.peligro ? '' : undefined}
            onClick={() => responder(false)}
          >
            {p.cancelar ?? 'Cancelar'}
          </button>{' '}
          <button
            type="button"
            className={`btn ${p.peligro ? 'btn-urgente' : 'btn-primario'}`}
            data-autofocus={p.peligro ? undefined : ''}
            onClick={() => responder(true)}
          >
            {p.confirmar ?? 'Confirmar'}
          </button>
        </>
      }
    />
  );
}
