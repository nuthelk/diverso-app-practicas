const CLAVE = 'demo1234';
const cuentas = [
  { etiqueta: 'Agencia verificada', email: 'graffiti@demo.com' },
  { etiqueta: 'En verificación', email: 'patrimonio@demo.com' },
  { etiqueta: 'Admin', email: 'admin@demo.com' },
];

/** Cuentas de demostración del login: la página solo las dibuja con `import.meta.env.DEV`, nunca en el build publicado. */
export default function CuentasDemo({ elegir }: { elegir: (email: string, password: string) => void }) {
  return (
    <section className="mt-8 border-t border-linea pt-5" aria-labelledby="demo-titulo">
      <h2 id="demo-titulo" className="etiqueta-seccion">
        Cuentas de demostración
      </h2>
      <p className="mt-1 text-detalle text-tinta-2">
        Solo en desarrollo. Contraseña de todas: <span className="font-bold text-tinta">{CLAVE}</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {cuentas.map((c) => (
          <button key={c.email} type="button" className="chip" onClick={() => elegir(c.email, CLAVE)}>
            {c.etiqueta}
          </button>
        ))}
      </div>
    </section>
  );
}
