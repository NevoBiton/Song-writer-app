import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Music2, ArrowLeft, Mail } from 'lucide-react';
import { useUILanguage } from '../../context/UILanguageContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import api from '../../lib/api';
import AuthLanguageToggle from './AuthLanguageToggle';

export default function ForgotPasswordPage() {
  const { t, uiLang } = useUILanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email, lang: uiLang });
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Something went wrong. Please try again.');
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
        </div>

        {submitted ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-amber-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{t.checkYourEmail}</h2>
            <p className="text-sm text-gray-500 mb-4">{t.resetEmailSent}</p>
            <Link
              to="/sign-in"
              className="text-sm text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              {t.backToSignIn}
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-gray-500 mb-4">{t.forgotPasswordDesc}</p>
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

              {error && (
                <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full h-11 bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold border-0"
              >
                {loading ? t.sendingResetLink : t.sendResetLink}
              </Button>
            </form>
          </div>
        )}

        {!submitted && (
          <p className="text-center text-sm text-gray-500 mt-5">
            <Link
              to="/sign-in"
              className="text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              {t.backToSignIn}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
