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
      <label htmlFor={id} className="text-sm font-medium text-on-surface">{label}</label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={`w-full h-10 px-3 bg-surface-container rounded-lg border text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant/50 focus:ring-1 ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
            : 'border-outline-variant focus:border-accent focus:ring-accent'
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
    <div className="flex min-h-screen">
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-navy to-accent p-8 flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-secondary-fixed/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center text-white border border-white/20">
              <span className="material-symbols-outlined">inventory_2</span>
            </div>
            <span className="text-2xl font-semibold text-white tracking-tight">StockSavvy</span>
          </div>
          <div className="max-w-sm">
            <h1 className="text-[32px] font-semibold text-white leading-10 tracking-tight mb-4">Master Your Enterprise Inventory.</h1>
            <p className="text-base text-white/80 leading-6">Streamline your supply chain, track assets in real-time, and make data-driven decisions with our intelligent inventory management platform.</p>
          </div>
          <div className="text-xs text-white/60 tracking-wide">&copy; 2026 StockSavvy Inc. All rights reserved.</div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-8 bg-surface">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 bg-navy text-white rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined">inventory_2</span>
            </div>
            <span className="text-2xl font-semibold text-on-surface tracking-tight">StockSavvy</span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-on-surface mb-1">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
            <p className="text-sm text-on-surface-variant">{mode === 'login' ? 'Please enter your details to sign in.' : 'Join 2,000+ companies managing smarter inventory.'}</p>
          </div>

          <div className="flex p-1 bg-surface-container rounded-lg mb-6 border border-outline-variant/20">
            {(['login', 'register'] as const).map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); setErrors({}); setApiError(null); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === m ? 'bg-surface text-on-surface shadow-sm border border-outline-variant/10' : 'text-on-surface-variant hover:text-on-surface'}`}>
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
                  <div className="relative flex items-center justify-center w-4 h-4 rounded border border-outline-variant group-hover:border-accent transition-colors">
                    <input type="checkbox" className="peer appearance-none w-full h-full rounded cursor-pointer checked:bg-accent checked:border-accent transition-all" />
                    <span className="material-symbols-outlined text-white text-[12px] absolute opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none select-none">check</span>
                  </div>
                  <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">Remember me</span>
                </label>
                <a href="/forgot-password" onClick={(e) => { e.preventDefault(); navigate('/forgot-password'); }} className="text-sm text-accent font-medium hover:underline cursor-pointer">Forgot password?</a>
              </div>
            )}

            <Button type="submit" className="w-full bg-navy hover:bg-navy/90 cursor-pointer" disabled={loading}>
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
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-outline-variant" /></div>
                <span className="relative bg-surface px-2 text-xs text-on-surface-variant uppercase tracking-wide">Or continue with</span>
              </div>
              <div className="flex">
                <Button variant="outline" className="flex-1 gap-2"><GoogleIcon /> Google</Button>
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-on-surface-variant mt-6">
              Already have an account?{' '}
              <button type="button" onClick={() => { setMode('login'); setErrors({}); setApiError(null); }} className="text-accent font-semibold hover:underline cursor-pointer">Sign in</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
