import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/api/client';
import { forgotPasswordSchema } from '@/features/auth/validations';

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

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setFieldErrors({});
    
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        ...(flat.email?.[0] && { email: flat.email[0] }),
      });
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-sm border border-gray-200 p-8 sm:p-10">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-[#0066CC] text-white rounded-xl flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined">inventory_2</span>
          </div>
          <span className="text-2xl font-semibold text-gray-900 tracking-tight">StockSavvy</span>
        </div>

        <button onClick={() => navigate('/login')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to login
        </button>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-1">Forgot Password</h2>
            <p className="text-sm text-gray-500">Enter your email address and we'll send you a link to reset your password.</p>
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
                error={fieldErrors.email}
                required
              />

              <Button type="submit" className="w-full cursor-pointer h-11 text-base mt-2" disabled={loading}>
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
  );
}
