import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Manda para /auth quem não está logado. Espera `loading` terminar antes de
 * decidir — sem isso o usuário é expulso no primeiro render, antes de a sessão
 * ser restaurada do storage.
 */
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  return { user, loading };
}
