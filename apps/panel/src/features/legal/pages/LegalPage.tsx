import Logo from '@/shared/ui/Logo';
import Aviso from '@/shared/ui/Aviso';
import Icono from '@/shared/ui/Icono';
import { ICONOS } from '@/shared/ui/iconos';
import { DOCUMENTOS, VERSION_LEGAL, type DocumentoLegal } from '../model/legal';
import { useVolverLegal } from '../hooks/useVolverLegal';

export default function LegalPage({ doc }: { doc: string }) {
  const documento: DocumentoLegal | undefined = DOCUMENTOS[doc as DocumentoLegal['id']];
  const volver = useVolverLegal();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-linea bg-niebla/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4 sm:px-6">
          <Logo size={28} clase="text-helecho" />
          <span className="text-destacado font-bold">
            <span className="max-sm:hidden">Diverso&nbsp;·&nbsp;</span>Documentos legales
          </span>
          <div className="flex-1"></div>
          <button type="button" className="btn btn-secundario whitespace-nowrap" onClick={volver}>
            <Icono trazo={ICONOS.atras} clase="size-4" />
            Volver
          </button>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-10 sm:px-6">
        {!documento ? (
          <>
            <h1 className="text-pagina">No encontramos ese documento</h1>
            <p className="mt-2 text-cuerpo text-tinta-2">Estos son los documentos legales de Diverso:</p>
            <ul className="mt-4 space-y-2 text-cuerpo">
              {Object.values(DOCUMENTOS).map((d) => (
                <li key={d.id}>
                  <a className="enlace" href={'#/legal/' + d.id}>
                    {d.titulo}
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="etiqueta-seccion">VERSIÓN {VERSION_LEGAL.toUpperCase()}</p>
            <h1 className="mt-2 text-pagina text-balance">{documento.titulo}</h1>
            <p className="mt-3 text-destacado text-tinta-2">{documento.resumen}</p>

            {/* Es un pendiente del equipo (revisión de un abogado antes del lanzamiento), no información para quien lee el documento. */}
            {import.meta.env.DEV && (
              <div className="mt-6">
                <Aviso role="note">
                  Solo en desarrollo. Borrador para el piloto académico: debe revisarlo un abogado y completarse con los datos
                  del responsable antes del lanzamiento comercial.
                </Aviso>
              </div>
            )}

            {documento.secciones.map((s) => (
              <section key={s.titulo} className="mt-9 border-t border-linea pt-6">
                <h2 className="text-seccion">{s.titulo}</h2>
                {s.parrafos.map((p, i) => (
                  <p key={i} className="mt-3 text-cuerpo leading-relaxed text-tinta">
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </>
        )}
      </article>
    </div>
  );
}
