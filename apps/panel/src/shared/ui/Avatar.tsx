export default function Avatar({ iniciales, tam = 34 }: { iniciales: string; tam?: number }) {
  const letras =
    iniciales
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join('') || '?';

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-brote bg-helecho font-bold text-sobre-helecho"
      style={{ width: tam, height: tam, fontSize: tam * 0.36 }}
    >
      {letras}
    </div>
  );
}
