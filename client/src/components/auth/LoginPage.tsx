import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Music2 } from 'lucide-react';
import { toast } from 'sonner';
import GoogleLoginButton from './GoogleLoginButton';
import { useAuth } from '../../context/AuthContext';
import { useUILanguage } from '../../context/UILanguageContext';
import AuthLanguageToggle from './AuthLanguageToggle';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { PasswordInput } from '../ui/PasswordInput';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const { t } = useUILanguage();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password, true);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        toast.error(t.signInFailed);
      } else {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.error(msg || t.signInFailed);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse: { credential?: string }) {
    if (!credentialResponse.credential) return;
    setLoading(true);
    try {
      await loginWithGoogle(credentialResponse.credential);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-dvh bg-gray-50 flex flex-col items-center justify-center px-5 py-10">
      <AuthLanguageToggle />
      <div className="w-full max-w-sm">


        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-amber-400 rounded-2xl flex items-center justify-center shadow-md mb-3">
            <Music2 className="w-7 h-7 text-gray-900" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">WordChord</h1>
          <p className="text-sm text-gray-500 mt-1">{t.signInToAccount}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-700 font-medium">{t.emailLabel}</Label>
              <Input
                id="email"
                type="email"
                autoFocus
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="h-11 focus-visible:ring-amber-400 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-700 font-medium">{t.passwordLabel}</Label>
                <Link to="/forgot-password" className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                  {t.forgotPassword}
                </Link>
              </div>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11 focus-visible:ring-amber-400 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold border-0"
            >
              {loading ? t.signingIn : t.signIn}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400 uppercase tracking-wide">{t.orContinueWith}</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* Google button */}
          <GoogleLoginButton
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error('Google sign-in failed')}
          />
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          {t.dontHaveAccount}{' '}
          <Link to="/sign-up" className="text-amber-600 hover:text-amber-700 font-medium">
            {t.signUpLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
