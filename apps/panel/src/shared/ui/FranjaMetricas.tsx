import type { CSSProperties, ReactNode } from 'react';

/** Las cifras del período en una sola franja (5 en escritorio, 3 y 2 en pantallas más angostas), separadas por líneas finas. */
export default function FranjaMetricas({ columnas = 5, children }: { columnas?: number; children: ReactNode }) {
  return (
    <dl className="franja" style={{ '--franja-columnas': columnas } as CSSProperties}>
      {children}
    </dl>
  );
}
