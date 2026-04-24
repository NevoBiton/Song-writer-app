import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Music2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { useUILanguage } from '../../context/UILanguageContext';
import api from '@/lib/api';
import AuthLanguageToggle from './AuthLanguageToggle';

type Status = 'loading' | 'success' | 'error';

export default function ConfirmEmailPage() {
  const [searchParams] = useSearchParams();
  const { t } = useUILanguage();
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) { setStatus('error'); return; }

    const controller = new AbortController();

    api.get(`/auth/confirm-email?token=${encodeURIComponent(token)}`, { signal: controller.signal })
      .then(() => setStatus('success'))
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED') return; // React Strict Mode cleanup
        setStatus('error');
      });

    return () => controller.abort();
  }, [searchParams]);

  return (
    <div className="relative min-h-dvh bg-gray-50 flex flex-col items-center justify-center px-5 py-10">
      <AuthLanguageToggle />
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 bg-amber-400 rounded-2xl flex items-center justify-center shadow-md mb-6 mx-auto">
          <Music2 className="w-7 h-7 text-gray-900" />
        </div>

        {status === 'loading' && (
          <p className="text-gray-500 text-sm">{t.confirmingEmail}</p>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.emailConfirmedTitle}</h1>
            <p className="text-sm text-gray-500 mb-6">{t.emailConfirmedDesc}</p>
            <Link to="/sign-in">
              <Button className="w-full h-11 bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold border-0">
                {t.signIn}
              </Button>
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.confirmEmailExpiredTitle}</h1>
            <p className="text-sm text-gray-500 mb-6">{t.confirmEmailExpiredDesc}</p>
            <Link to="/sign-up">
              <Button variant="outline" className="w-full h-11">
                {t.signUpLink}
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
