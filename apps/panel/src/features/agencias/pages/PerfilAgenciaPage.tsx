import Pagina from '@/shared/ui/Pagina';
import PageHeader from '@/shared/ui/PageHeader';
import EsqueletoPagina from '@/shared/ui/EsqueletoPagina';
import Tarjeta from '@/shared/ui/Tarjeta';
import Empty from '@/shared/ui/Empty';
import AlertaError from '@/shared/ui/AlertaError';
import StatusPill from '@/shared/ui/StatusPill';
import Campo from '@/shared/ui/Campo';
import { textoVigencia } from '../model/verificacion';
import { avisarCambioAgencia } from '../model/cambios-agencia';
import LogoAgencia from '../components/LogoAgencia';
import { useMiAgencia } from '../hooks/useMiAgencia';
import { useEdicionDatosAgencia } from '../hooks/useEdicionDatosAgencia';

/** Lo que la agencia no llenó (teléfono, correo y WhatsApp pueden ser null) se dice, no se deja en blanco. */
const registrado = (valor: string | null) => (valor ?? '').trim() || 'No registrado';

/**
 * El perfil de la agencia: su logo (cambiar o quitar) y sus datos de contacto, que se editan aquí. El RNT y la
 * matrícula respaldan la verificación: se muestran pero no se cambian. Se abre desde el menú de cuenta del marco.
 */
export default function PerfilAgenciaPage() {
  const { cargando, error, datos: agencia, setDatos: setAgencia, recargar } = useMiAgencia();
  const {
    editando,
    borrador,
    cambiar,
    fallas,
    errorDe,
    faltan,
    guardando,
    errorGuardado,
    formulario,
    botonEditar,
    empezarEdicion,
    cerrarEdicion,
    alTeclear,
    guardar,
  } = useEdicionDatosAgencia(agencia, setAgencia);

  function logoActualizado(logoUrl: string | null) {
    setAgencia((a) => (a ? { ...a, logo_url: logoUrl } : a));
    avisarCambioAgencia();
  }

  if (cargando) return <EsqueletoPagina ancho={820} filas={2} clase="h-40" />;

  const vigencia = agencia ? textoVigencia(agencia) : null;

  return (
    <Pagina ancho={820}>
      <PageHeader titulo="Perfil de la agencia" contexto="Tu logo y los datos de contacto de tu agencia." />

      {error ? (
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
          <AlertaError>{error}</AlertaError>
          <button type="button" className="btn btn-secundario btn-chico" onClick={recargar}>
            Reintentar
          </button>
        </div>
      ) : !agencia ? (
        <div className="mt-6 tarjeta">
          <Empty
            icono="edificio"
            titulo="Aún no tienes agencia"
            mensaje="Registra tu agencia para tener un perfil."
            accion={
              <a className="btn btn-primario" href="#/onboarding">
                Registrar mi agencia
              </a>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-6">
          <LogoAgencia agencia={agencia} onactualizado={logoActualizado} />

          <Tarjeta
            titulo="Datos de la agencia"
            descripcion={
              editando ? 'Los viajeros ven el nombre, la ciudad y la descripción de tu agencia.' : 'Así se presenta y se contacta tu agencia.'
            }
            accion={
              !editando && (
                <button ref={botonEditar} type="button" className="btn btn-secundario btn-chico" onClick={empezarEdicion}>
                  Editar datos
                </button>
              )
            }
          >
            {editando ? (
              // Escape llega desde los campos del formulario (el diálogo de confirmación vive fuera de él).
              <form ref={formulario} className="grid gap-4 sm:grid-cols-2" onSubmit={guardar} onKeyDown={alTeclear} noValidate>
                {fallas.length > 0 && <AlertaError clase="sm:col-span-2">Para guardar falta completar {faltan}.</AlertaError>}
                {errorGuardado && <AlertaError clase="sm:col-span-2">{errorGuardado}</AlertaError>}

                <Campo
                  clase="sm:col-span-2"
                  etiqueta="Nombre de la agencia"
                  error={errorDe('nombre')}
                  control={(a) => (
                    <input {...a} value={borrador.nombre} onChange={(e) => cambiar('nombre', e.target.value)} className="campo" autoComplete="organization" />
                  )}
                />
                <Campo
                  etiqueta="Ciudad"
                  error={errorDe('ciudad')}
                  control={(a) => (
                    <input {...a} value={borrador.ciudad} onChange={(e) => cambiar('ciudad', e.target.value)} className="campo" autoComplete="address-level2" />
                  )}
                />
                <Campo
                  etiqueta="Teléfono"
                  error={errorDe('telefono')}
                  control={(a) => (
                    <input
                      {...a}
                      value={borrador.telefono}
                      onChange={(e) => cambiar('telefono', e.target.value)}
                      className="campo"
                      type="tel"
                      autoComplete="tel"
                    />
                  )}
                />
                <Campo
                  etiqueta="Correo de contacto"
                  error={errorDe('email')}
                  control={(a) => (
                    <input
                      {...a}
                      value={borrador.email}
                      onChange={(e) => cambiar('email', e.target.value)}
                      className="campo"
                      type="email"
                      autoComplete="email"
                    />
                  )}
                />
                <Campo
                  etiqueta="WhatsApp (opcional)"
                  control={(a) => (
                    <input
                      {...a}
                      value={borrador.whatsapp}
                      onChange={(e) => cambiar('whatsapp', e.target.value)}
                      placeholder="+57…"
                      className="campo"
                      type="tel"
                    />
                  )}
                />
                <Campo
                  clase="sm:col-span-2"
                  etiqueta="Descripción (opcional)"
                  control={(a) => (
                    <textarea
                      {...a}
                      rows={3}
                      value={borrador.descripcion}
                      onChange={(e) => cambiar('descripcion', e.target.value)}
                      className="campo resize-none"
                      placeholder="Qué tipo de experiencias ofreces y desde cuándo operas."
                    ></textarea>
                  )}
                />

                <div className="border-t border-linea pt-4 sm:col-span-2">
                  <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-detalle text-tinta-2">Número de RNT</dt>
                      <dd className="font-semibold tabular-nums">{agencia.numero_rnt}</dd>
                    </div>
                    <div>
                      <dt className="text-detalle text-tinta-2">Matrícula mercantil</dt>
                      <dd className="font-semibold tabular-nums">{agencia.matricula_camara_comercio}</dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-detalle text-tinta-2">No se pueden cambiar desde aquí: respaldan la verificación de tu agencia.</p>
                </div>

                <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
                  <button type="button" className="btn btn-secundario" disabled={guardando} onClick={cerrarEdicion}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primario" disabled={guardando}>
                    {guardando ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </form>
            ) : (
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-detalle text-tinta-2">Nombre</dt>
                  <dd className="text-destacado font-semibold [overflow-wrap:anywhere]">{agencia.nombre}</dd>
                </div>
                <div>
                  <dt className="text-detalle text-tinta-2">Verificación</dt>
                  <dd className="mt-0.5">
                    <StatusPill estado={agencia.estado_verificacion} />
                  </dd>
                </div>
                <div>
                  <dt className="text-detalle text-tinta-2">Ciudad</dt>
                  <dd>{agencia.ciudad}</dd>
                </div>
                <div>
                  <dt className="text-detalle text-tinta-2">Número de RNT</dt>
                  <dd className="font-semibold tabular-nums">{agencia.numero_rnt}</dd>
                </div>
                <div>
                  <dt className="text-detalle text-tinta-2">Vigencia del RNT</dt>
                  <dd className={`font-semibold ${vigencia?.clase}`}>{vigencia?.texto}</dd>
                </div>
                <div>
                  <dt className="text-detalle text-tinta-2">Matrícula mercantil</dt>
                  <dd className="font-semibold tabular-nums">{agencia.matricula_camara_comercio}</dd>
                </div>
                <div>
                  <dt className="text-detalle text-tinta-2">Correo de contacto</dt>
                  <dd className="[overflow-wrap:anywhere]">{registrado(agencia.email)}</dd>
                </div>
                <div>
                  <dt className="text-detalle text-tinta-2">Teléfono</dt>
                  <dd>{registrado(agencia.telefono)}</dd>
                </div>
                <div>
                  <dt className="text-detalle text-tinta-2">WhatsApp</dt>
                  <dd>{registrado(agencia.whatsapp)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-detalle text-tinta-2">Descripción</dt>
                  <dd className="max-w-[68ch] whitespace-pre-line [overflow-wrap:anywhere]">{registrado(agencia.descripcion)}</dd>
                </div>
              </dl>
            )}
          </Tarjeta>
        </div>
      )}
    </Pagina>
  );
}
