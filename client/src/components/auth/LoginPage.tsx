import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Music2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUILanguage } from '../../context/UILanguageContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useUILanguage();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if ((err as { response?: { data?: { error?: string } } })?.response?.data?.error) {
        setError((err as { response: { data: { error: string } } }).response.data.error);
      } else {
        setError(msg || 'Sign in failed');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col items-center justify-center px-5 py-10">
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
              <Label htmlFor="password" className="text-gray-700 font-medium">{t.passwordLabel}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11 focus-visible:ring-amber-400 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold border-0"
            >
              {loading ? t.signingIn : t.signIn}
            </Button>
          </form>
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
