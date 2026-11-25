import Pagina from '@/shared/ui/Pagina';
import PageHeader from '@/shared/ui/PageHeader';
import Campo from '@/shared/ui/Campo';
import AlertaError from '@/shared/ui/AlertaError';
import Consentimiento from '@/features/legal/components/Consentimiento';
import { useRegistroAgencia } from '../hooks/useRegistroAgencia';

const PASOS = [
  { n: 1, titulo: 'Registra tus datos', texto: 'RNT, matrícula y contacto.' },
  { n: 2, titulo: 'Verificamos', texto: 'Contrastamos el RNT y la matrícula.' },
  { n: 3, titulo: 'Publica y vende', texto: 'Tus planes aparecen en la app.' },
];

export default function OnboardingPage() {
  const {
    campos,
    cambiar,
    aceptaDatos,
    setAceptaDatos,
    aceptaTerminos,
    setAceptaTerminos,
    guardando,
    error,
    fallas,
    errorDe,
    faltan,
    formulario,
    guardar,
  } = useRegistroAgencia();

  return (
    <Pagina ancho={760}>
      <PageHeader
        titulo="Registra tu agencia"
        contexto={
          <>
            Solo publicamos agencias formales: verificamos tu Registro Nacional de Turismo (RNT) y tu matrícula mercantil antes
            de que tus planes aparezcan en el catálogo. Hasta que registres tu agencia no podrás usar Planes, Ventas ni
            Liquidaciones.
          </>
        }
      />

      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {PASOS.map((p) => (
          <li key={p.n} className="tarjeta flex items-start gap-3 p-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-pildora bg-helecho text-detalle font-bold text-sobre-helecho">
              {p.n}
            </span>{' '}
            <span>
              <span className="block text-cuerpo leading-tight font-bold">{p.titulo}</span>{' '}
              <span className="mt-0.5 block text-detalle text-tinta-2">{p.texto}</span>
            </span>
          </li>
        ))}
      </ol>

      <form ref={formulario} className="tarjeta mt-5 grid gap-4 p-5 sm:grid-cols-2 sm:p-6" onSubmit={guardar} noValidate>
        <p className="text-detalle text-tinta-2 sm:col-span-2">Todos los campos son obligatorios, salvo WhatsApp y la descripción.</p>

        <Campo
          clase="sm:col-span-2"
          etiqueta="Nombre de la agencia"
          error={errorDe('nombre')}
          control={(a) => (
            <input {...a} value={campos.nombre} onChange={(e) => cambiar('nombre', e.target.value)} className="campo" autoComplete="organization" />
          )}
        />
        <Campo
          etiqueta="Número de RNT"
          ayuda="Registro Nacional de Turismo: el número de tu certificado, de 4 a 8 dígitos."
          error={errorDe('rnt')}
          control={(a) => (
            <input
              {...a}
              value={campos.numeroRnt}
              onChange={(e) => cambiar('numeroRnt', e.target.value)}
              className="campo"
              inputMode="numeric"
              placeholder="Ej. 85421"
            />
          )}
        />
        <Campo
          etiqueta="Matrícula mercantil"
          ayuda="La de la Cámara de Comercio, solo números; puedes usar guiones."
          error={errorDe('matricula')}
          control={(a) => (
            <input
              {...a}
              value={campos.matricula}
              onChange={(e) => cambiar('matricula', e.target.value)}
              className="campo"
              inputMode="numeric"
              placeholder="Ej. 02345678-9"
            />
          )}
        />
        <Campo
          etiqueta="Ciudad"
          error={errorDe('ciudad')}
          control={(a) => (
            <input {...a} value={campos.ciudad} onChange={(e) => cambiar('ciudad', e.target.value)} className="campo" autoComplete="address-level2" />
          )}
        />
        <Campo
          etiqueta="Teléfono"
          error={errorDe('telefono')}
          control={(a) => (
            <input
              {...a}
              value={campos.telefono}
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
              value={campos.email}
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
              value={campos.whatsapp}
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
              value={campos.descripcion}
              onChange={(e) => cambiar('descripcion', e.target.value)}
              className="campo resize-none"
              placeholder="Qué tipo de experiencias ofreces y desde cuándo operas."
            ></textarea>
          )}
        />

        <div className="border-t border-linea pt-4 sm:col-span-2">
          <Consentimiento
            datos={aceptaDatos}
            setDatos={setAceptaDatos}
            terminos={aceptaTerminos}
            setTerminos={setAceptaTerminos}
            errorDatos={errorDe('datos')}
            errorTerminos={errorDe('terminos')}
          />
        </div>

        {fallas.length > 0 && <AlertaError clase="sm:col-span-2">Para enviar falta completar {faltan}.</AlertaError>}
        {error && <AlertaError clase="sm:col-span-2">{error}</AlertaError>}

        <div className="flex justify-end sm:col-span-2">
          <button type="submit" className="btn btn-primario" disabled={guardando}>
            {guardando ? 'Enviando…' : 'Enviar a verificación'}
          </button>
        </div>
      </form>
    </Pagina>
  );
}
