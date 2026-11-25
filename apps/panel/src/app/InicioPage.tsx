import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/features/auth/model/auth';

/** `/`: con sesión va al Starter, que reparte por rol. Sin sesión, el guard del layout raíz manda a /login. */
export default function InicioPage() {
  const { userId } = useAuth();
  const navegar = useNavigate();

  useEffect(() => {
    if (userId) navegar('/starter', { replace: true });
  }, [userId, navegar]);

  return null;
}
