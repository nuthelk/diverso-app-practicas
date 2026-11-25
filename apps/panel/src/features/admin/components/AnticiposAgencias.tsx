import Tarjeta from '@/shared/ui/Tarjeta';
import TablaDatos, { type Columna } from '@/shared/ui/TablaDatos';
import { textoCuenta, type CuentaResumen } from '@/features/liquidaciones/model/liquidaciones';
import type { Agency } from '@/features/agencias/model/agencia';

const COLUMNAS: Columna[] = [
  { clave: 'agencia', titulo: 'Agencia', principal: true },
  { clave: 'cuenta', titulo: 'Cuenta para dispersiones' },
  { clave: 'anticipos', titulo: 'Anticipos' },
];

export default function AnticiposAgencias({
  agencias,
  cuentaDe,
  onalternar,
}: {
  agencias: Agency[];
  cuentaDe: (agencyId: string) => CuentaResumen | undefined;
  onalternar: (agencia: Agency) => void;
}) {
  return (
    <Tarjeta
      titulo="Anticipos por agencia"
      descripcion="Una agencia bloqueada deja de recibir anticipos nuevos; sus liquidaciones semanales siguen igual."
      sinRelleno
      clase="mt-10"
    >
      <TablaDatos
        caption="Anticipos por agencia"
        columnas={COLUMNAS}
        filas={agencias}
        clave={(a) => a.id}
        celda={(a, c) =>
          c.clave === 'agencia' ? (
            a.nombre
          ) : c.clave === 'cuenta' ? (
            textoCuenta(cuentaDe(a.id))
          ) : (
            <span className="inline-flex flex-wrap items-center gap-2">
              <span className={`pildora ${a.anticipo_bloqueado ? 'pildora-alerta' : 'pildora-ok'}`}>
                {a.anticipo_bloqueado ? 'Bloqueados' : 'Habilitados'}
              </span>
              <button className={`btn btn-chico ${a.anticipo_bloqueado ? 'btn-secundario' : 'btn-peligro'}`} onClick={() => onalternar(a)}>
                {a.anticipo_bloqueado ? 'Desbloquear anticipo' : 'Bloquear anticipo'}
              </button>
            </span>
          )
        }
        vacio="Aún no hay agencias verificadas."
      />
    </Tarjeta>
  );
}
