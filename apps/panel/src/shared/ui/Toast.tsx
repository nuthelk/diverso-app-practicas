import { useToast } from '@/shared/lib/toast';

export default function Toast() {
  const { mensaje } = useToast();
  if (!mensaje) return null;
  return (
    <div
      className="aparecer fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-tinta px-5 py-2.5
      text-cuerpo font-semibold text-niebla shadow-xl"
      role="status"
    >
      {mensaje}
    </div>
  );
}
