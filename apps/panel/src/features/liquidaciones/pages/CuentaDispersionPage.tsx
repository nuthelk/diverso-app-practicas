import EsqueletoPagina from '@/shared/ui/EsqueletoPagina';
import Pagina from '@/shared/ui/Pagina';
import PageHeader from '@/shared/ui/PageHeader';
import Empty from '@/shared/ui/Empty';
import Select from '@/shared/ui/Select';
import Tarjeta from '@/shared/ui/Tarjeta';
import Campo from '@/shared/ui/Campo';
import AlertaError from '@/shared/ui/AlertaError';
import { BANCOS, TIPOS_CUENTA, TIPOS_DOCUMENTO, type TipoCuenta, type TipoDocumento } from '../model/liquidaciones';
import { useCuentaDispersion } from '../hooks/useCuentaDispersion';

/** La cuenta a la que se dispersan las liquidaciones. Contenedor: el estado vive en `useCuentaDispersion`. */
export default function CuentaDispersionPage() {
  const { cargando, guardando, error, agencia, existe, c, setC, errores, mostrar, guardar } = useCuentaDispersion();

  if (cargando) return <EsqueletoPagina filas={4} clase="h-14" ancho={640} />;
  if (!agencia) {
    return (
      <Empty
        icono={error ? 'sinConexion' : 'edificio'}
        titulo={error ? 'Sin conexión' : 'Aún no tienes agencia'}
        mensaje={error || 'Registra tu agencia para configurar tu cuenta para dispersiones.'}
      />
    );
  }

  return (
    <Pagina ancho={640}>
      <PageHeader
        titulo="Cuenta para dispersiones"
        contexto={
          <>
            Es la cuenta a la que se dispersan tus liquidaciones. Solo tu agencia y el equipo Diverso pueden verla; en las
            listas solo se muestran los 4 últimos dígitos.
          </>
        }
      />

      <p className="mt-4 text-detalle text-tinta-2">Todos los campos son obligatorios.</p>

      <Tarjeta etiqueta="Datos de la cuenta" clase="mt-3">
        <form className="space-y-4" onSubmit={guardar} noValidate>
          <Campo
            etiqueta="Banco"
            error={mostrar(errores.banco)}
            control={(atributos) => (
              <>
                <input
                  className="campo"
                  list="bancos-sugeridos"
                  value={c.banco}
                  onChange={(e) => setC((c) => ({ ...c, banco: e.target.value }))}
                  aria-required="true"
                  autoComplete="off"
                  {...atributos}
                />
                <datalist id="bancos-sugeridos">
                  {BANCOS.map((b) => (
                    <option key={b} value={b}></option>
                  ))}
                </datalist>
              </>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span id="etiqueta-tipo-cuenta" className="etiqueta-campo">
                Tipo de cuenta
              </span>
              <Select
                etiquetadoPor="etiqueta-tipo-cuenta"
                opciones={TIPOS_CUENTA.map((t) => ({ valor: t.valor, etiqueta: t.etiqueta }))}
                valor={c.tipo_cuenta}
                onchange={(v) => setC((c) => ({ ...c, tipo_cuenta: v as TipoCuenta }))}
              />
            </div>
            <Campo
              etiqueta="Número de cuenta"
              error={mostrar(errores.numero_cuenta)}
              control={(atributos) => (
                <input
                  className="campo tabular-nums"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-required="true"
                  value={c.numero_cuenta}
                  onChange={(e) => setC((c) => ({ ...c, numero_cuenta: e.target.value }))}
                  {...atributos}
                />
              )}
            />
          </div>

          <Campo
            etiqueta="Titular"
            error={mostrar(errores.titular)}
            control={(atributos) => (
              <input
                className="campo"
                value={c.titular}
                onChange={(e) => setC((c) => ({ ...c, titular: e.target.value }))}
                aria-required="true"
                autoComplete="off"
                {...atributos}
              />
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span id="etiqueta-tipo-documento" className="etiqueta-campo">
                Tipo de documento
              </span>
              <Select
                etiquetadoPor="etiqueta-tipo-documento"
                opciones={TIPOS_DOCUMENTO.map((t) => ({ valor: t.valor, etiqueta: t.etiqueta }))}
                valor={c.tipo_documento}
                onchange={(v) => setC((c) => ({ ...c, tipo_documento: v as TipoDocumento }))}
              />
            </div>
            <Campo
              etiqueta="Número de documento"
              error={mostrar(errores.numero_documento)}
              control={(atributos) => (
                <input
                  className="campo tabular-nums"
                  autoComplete="off"
                  aria-required="true"
                  value={c.numero_documento}
                  onChange={(e) => setC((c) => ({ ...c, numero_documento: e.target.value }))}
                  {...atributos}
                />
              )}
            />
          </div>

          {error && <AlertaError>{error}</AlertaError>}

          <div className="flex justify-end gap-2 pt-1">
            <a className="btn btn-secundario" href="#/liquidaciones">
              Cancelar
            </a>
            <button type="submit" className="btn btn-primario" disabled={guardando}>
              {guardando ? 'Guardando…' : existe ? 'Actualizar cuenta' : 'Guardar cuenta'}
            </button>
          </div>
        </form>
      </Tarjeta>
    </Pagina>
  );
}
