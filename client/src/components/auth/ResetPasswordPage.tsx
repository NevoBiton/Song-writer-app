import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Music2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useUILanguage } from '../../context/UILanguageContext';
import AuthLanguageToggle from './AuthLanguageToggle';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import api from '../../lib/api';

export default function ResetPasswordPage() {
  const { t, uiLang, setUiLang } = useUILanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const langParam = searchParams.get('lang');

  // Apply language from email link on first render
  useEffect(() => {
    if (langParam === 'he') setUiLang('he');
    else if (langParam === 'en') setUiLang('en');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep lang param in sync when user changes language manually
  useEffect(() => {
    if (!token) return;
    navigate(`/reset-password?token=${token}&lang=${uiLang}`, { replace: true });
  }, [uiLang]); // eslint-disable-line react-hooks/exhaustive-deps

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!token) { navigate('/sign-in', { replace: true }); return; }
    api.get(`/auth/reset-password/verify?token=${token}`)
      .then(res => { if (!res.data.valid) setExpired(true); })
      .catch(() => setExpired(true))
      .finally(() => setChecking(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirm) {
      toast.error(t.toastPasswordsDoNotMatch);
      return;
    }
    if (password.length < 6) {
      toast.error(t.toastPasswordMinLength);
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success(t.passwordResetSuccess);
      navigate('/sign-in', { replace: true });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 400) {
        setExpired(true);
      } else {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        toast.error(msg || t.invalidResetToken);
      }
    } finally {
      setLoading(false);
    }
  }

  if (!token || checking) return null;

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
          {!expired && <p className="text-sm text-gray-500 mt-1">{t.resetPasswordTitle}</p>}
        </div>

        {expired ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">{t.resetLinkExpiredTitle}</h2>
            <p className="text-sm text-gray-500">{t.resetLinkExpiredDesc}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-gray-500 mb-4">{t.resetPasswordDesc}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-gray-700 font-medium">{t.newPassword}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  autoFocus
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-11 focus-visible:ring-amber-400 text-gray-900 placeholder:text-gray-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-gray-700 font-medium">{t.confirmNewPassword}</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-11 focus-visible:ring-amber-400 text-gray-900 placeholder:text-gray-400"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !password || !confirm}
                className="w-full h-11 bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold border-0"
              >
                {loading ? t.resettingPassword : t.resetPassword}
              </Button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
