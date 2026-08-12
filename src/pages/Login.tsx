import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore, type User } from '@/store/authStore';
import { api, ApiError } from '@/api/client';
import { loginSchema, registerSchema } from '@/features/auth/validations';

type Mode = 'login' | 'register';

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

function FormField({ id, type, placeholder, label, value, onChange, error, required }: {
  id: string; type: string; placeholder: string; label: string;
  value: string; onChange: (v: string) => void; error?: string; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-900">{label}</label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={`w-full h-10 px-3 bg-gray-50 rounded-lg border text-sm text-gray-900 outline-none transition-all placeholder:text-gray-500/50 focus:ring-1 ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-200 focus:border-accent focus:ring-accent'
        }`}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (mode === 'login') {
      const result = loginSchema.safeParse({ emailOrUsername: email, password });
      if (!result.success) {
        const flat = result.error.flatten().fieldErrors;
        setErrors({
          ...(flat.emailOrUsername?.[0] && { email: flat.emailOrUsername[0] }),
          ...(flat.password?.[0] && { password: flat.password[0] }),
        });
        return;
      }
      setErrors({});
      setLoading(true);
      try {
        const data = await api.post<{ access_token: string; user: User }>('/auth/login', result.data);
        setAuth(data.user, data.access_token);
        navigate('/');
      } catch (err) {
        setApiError(err instanceof ApiError ? err.message : 'Connection failed');
      } finally {
        setLoading(false);
      }
    } else {
      const result = registerSchema.safeParse({ name, username, email, password });
      if (!result.success) {
        const flat = result.error.flatten().fieldErrors;
        setErrors({
          ...(flat.name?.[0] && { name: flat.name[0] }),
          ...(flat.username?.[0] && { username: flat.username[0] }),
          ...(flat.email?.[0] && { email: flat.email[0] }),
          ...(flat.password?.[0] && { password: flat.password[0] }),
        });
        return;
      }
      setErrors({});
      setLoading(true);
      try {
        const data = await api.post<{ access_token: string; user: User }>('/auth/register', {
          name: result.data.name,
          username: result.data.username,
          email: result.data.email,
          password: result.data.password,
        });
        setAuth(data.user, data.access_token);
        navigate('/');
      } catch (err) {
        setApiError(err instanceof ApiError ? err.message : 'Connection failed');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-sm border border-gray-200 p-8 sm:p-10">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-[#0066CC] text-white rounded-xl flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined">inventory_2</span>
          </div>
          <span className="text-2xl font-semibold text-gray-900 tracking-tight">StockSavvy</span>
        </div>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-1">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
            <p className="text-sm text-gray-500">{mode === 'login' ? 'Please enter your details to sign in.' : 'Join 2,000+ companies managing smarter inventory.'}</p>
          </div>

          <div className="flex p-1 bg-gray-50 rounded-lg mb-6 border border-gray-200">
            {(['login', 'register'] as const).map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); setErrors({}); setApiError(null); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === m ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900'}`}>
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          {apiError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{apiError}</div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <>
                <FormField id="name" type="text" placeholder="John Doe" label="Full Name" value={name} onChange={setName} error={errors.name} required />
                <FormField id="username" type="text" placeholder="johndoe" label="Username" value={username} onChange={setUsername} error={errors.username} required />
              </>
            )}
            <FormField
              id="email"
              type="text"
              placeholder={mode === 'login' ? 'email@company.com' : 'name@company.com'}
              label={mode === 'login' ? 'Email or Username' : 'Work Email'}
              value={email}
              onChange={setEmail}
              error={errors.email}
              required
            />
            <FormField id="password" type="password" placeholder="••••••••" label="Password" value={password} onChange={setPassword} error={errors.password} required />

            {mode === 'login' && (
              <div className="flex items-center justify-between mt-1 mb-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center justify-center w-4 h-4 rounded border border-gray-200 group-hover:border-accent transition-colors">
                    <input type="checkbox" className="peer appearance-none w-full h-full rounded cursor-pointer checked:bg-[#0066CC] checked:border-accent transition-all" />
                    <span className="material-symbols-outlined text-white text-[12px] absolute opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none select-none">check</span>
                  </div>
                  <span className="text-sm text-gray-500 group-hover:text-gray-900 transition-colors">Remember me</span>
                </label>
                <a href="/forgot-password" onClick={(e) => { e.preventDefault(); navigate('/forgot-password'); }} className="text-sm text-[#0066CC] font-medium hover:underline cursor-pointer">Forgot password?</a>
              </div>
            )}

            <Button type="submit" className="w-full cursor-pointer h-11 text-base mt-2" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                <>
                  {mode === 'login' ? 'Sign in' : 'Create account'}
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </Button>
          </form>

          {mode === 'login' ? (
            <>
              <div className="relative text-center my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <span className="relative bg-white px-2 text-xs text-gray-500 uppercase tracking-wide">Or continue with</span>
              </div>
              <div className="flex">
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => { window.location.href = 'http://localhost:3000/auth/google'; }}
                >
                  <GoogleIcon /> Continue with Google
                </Button>
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{' '}
              <button type="button" onClick={() => { setMode('login'); setErrors({}); setApiError(null); }} className="text-[#0066CC] font-semibold hover:underline cursor-pointer">Sign in</button>
            </p>
          )}
        </div>
      </div>
  );
}
