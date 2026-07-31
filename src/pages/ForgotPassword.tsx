import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/api/client';

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

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<{ message: string }>('/auth/forgot-password', { email });
      setSuccess(response.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
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
            <h1 className="text-[32px] font-semibold text-white leading-10 tracking-tight mb-4">Secure Your Account.</h1>
            <p className="text-base text-white/80 leading-6">Regain access to your enterprise inventory management dashboard in just a few clicks.</p>
          </div>
          <div className="text-xs text-white/60 tracking-wide">&copy; 2026 StockSavvy Inc. All rights reserved.</div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-8 bg-surface">
        <div className="w-full max-w-md">
          <button onClick={() => navigate('/login')} className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface mb-8 transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to login
          </button>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-on-surface mb-1">Forgot Password</h2>
            <p className="text-sm text-on-surface-variant">Enter your email address and we'll send you a link to reset your password.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {success ? (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex flex-col gap-2">
              <div className="flex items-center gap-2 text-green-800 font-medium">
                <span className="material-symbols-outlined">check_circle</span>
                Check your email
              </div>
              <p className="text-sm text-green-700">{success}</p>
              <Button onClick={() => navigate('/login')} className="mt-2 bg-green-700 hover:bg-green-800 text-white">
                Return to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <FormField
                id="email"
                type="email"
                placeholder="email@company.com"
                label="Email Address"
                value={email}
                onChange={setEmail}
                required
              />

              <Button type="submit" className="w-full bg-navy hover:bg-navy/90 mt-2" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending link...
                  </span>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
