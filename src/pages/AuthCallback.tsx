import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { setAccessTokenCookie } from '@/lib/auth';
import { api } from '@/api/client';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      setAccessTokenCookie(token);
      
      api.get<any>('/users/me')
        .then((userData) => {
          console.log('Fetched user data:', userData);
          setAuth(userData, token);
          navigate('/');
        })
        .catch((err) => {
          console.error('Failed to fetch user data after OAuth', err);
          navigate('/login?error=auth_failed');
        });
    } else {
      navigate('/login?error=no_token');
    }
  }, [searchParams, navigate, setAuth]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm font-medium text-gray-600">Completing login...</p>
      </div>
    </div>
  );
}
