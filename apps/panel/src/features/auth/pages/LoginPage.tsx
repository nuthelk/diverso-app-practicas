import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import Logo from '@/shared/ui/Logo';
import Icono from '@/shared/ui/Icono';
import Campo from '@/shared/ui/Campo';
import AlertaError from '@/shared/ui/AlertaError';
import { ICONOS } from '@/shared/ui/iconos';
import { signIn, useAuth } from '../model/auth';
import CuentasDemo from './CuentasDemo';

const BENEFICIOS = [
  { icono: ICONOS.escudo, texto: 'Sello «Verificada RNT» que genera confianza' },
  { icono: ICONOS.calendario, texto: 'Cupos por fecha en tiempo real, sin sobreventa' },
  { icono: ICONOS.edificio, texto: 'Conciliación clara de tu comisión y del saldo a dispersar' },
];

export default function LoginPage() {
  const { userId } = useAuth();
  const navegar = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      await signIn(email.trim(), password);
      navegar('/starter');
    } catch {
      setError('Correo o contraseña incorrectos, o no hay conexión. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (userId) navegar('/starter');
  }, [userId, navegar]);

  return (
    <div className="grid min-h-screen lg:grid-cols-[5fr_6fr]">
      {/* Marca: el monte oscuro del marco, con el logo y lo que ofrece el panel */}
      <aside className="monte hidden bg-bosque p-12 text-sobre-bosque lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <span className="text-seccion font-bold">Diverso</span>
        </div>

        <div className="mt-auto">
          <p className="text-cifra-grande font-bold text-balance">Vende Antioquia al viajero correcto</p>
          <p className="mt-4 max-w-md text-destacado text-sobre-bosque-2">
            El marketplace donde las agencias verificadas publican experiencias y los viajeros del Valle de Aburrá reservan con
            confianza.
          </p>
          <ul className="mt-8 space-y-4 text-cuerpo font-semibold">
            {BENEFICIOS.map((b) => (
              <li key={b.texto} className="flex items-center gap-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-campo bg-bosque-2">
                  <Icono trazo={b.icono} clase="size-5" />
                </span>
                {b.texto}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-10 text-detalle text-sobre-bosque-2">© Diverso · Turismo de Antioquia</p>
      </aside>

      <main className="grid place-items-center bg-niebla px-5 py-12 sm:px-6">
        <div className="aparecer w-full max-w-md">
          <div className="mb-6 flex items-center gap-2.5 text-helecho lg:hidden">
            <Logo size={32} />
            <span className="text-destacado font-bold text-tinta">Diverso</span>
          </div>

          <div className="tarjeta p-6 sm:p-8">
            <h1 className="text-pagina">Entra a tu panel</h1>
            <p className="mt-2 text-cuerpo text-tinta-2">Publica planes, gestiona cupos y concilia tus pagos.</p>

            <form className="mt-6 space-y-4" onSubmit={entrar}>
              <Campo
                etiqueta="Correo de la agencia"
                control={(a) => (
                  <input
                    {...a}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tucorreo@agencia.com"
                    autoComplete="username"
                    className="campo"
                  />
                )}
              />
              <Campo
                etiqueta="Contraseña"
                control={(a) => (
                  <input
                    {...a}
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="campo"
                  />
                )}
              />

              {error && <AlertaError>{error}</AlertaError>}

              <button type="submit" disabled={cargando} className="btn btn-primario w-full">
                {cargando ? 'Entrando…' : 'Entrar'}
              </button>
            </form>

            {import.meta.env.DEV && (
              <CuentasDemo
                elegir={(correo, clave) => {
                  setEmail(correo);
                  setPassword(clave);
                  setError('');
                }}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
