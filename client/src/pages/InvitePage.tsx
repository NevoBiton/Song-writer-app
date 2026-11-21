import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Music2, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useUILanguage } from '@/context/UILanguageContext';

interface InvitePreview {
  songId: string;
  songTitle: string;
  invitedBy: string;
  expiresAt: string;
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { t } = useUILanguage();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .get<InvitePreview>(`/invite/${token}`)
      .then(r => setPreview(r.data))
      .catch(() => setError(t.inviteInvalid));
  }, [token, t]);

  async function handleJoin() {
    if (!token) return;
    setJoining(true);
    try {
      await api.post(`/invite/${token}/join`);
      toast.success(t.inviteJoined);
      navigate('/library');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        t.inviteInvalid;
      toast.error(msg);
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="w-16 h-16 bg-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-md">
          <Music2 className="w-8 h-8 text-gray-900" />
        </div>

        {error ? (
          <>
            <h1 className="text-xl font-bold text-foreground">{t.inviteInvalidTitle}</h1>
            <p className="text-muted-foreground text-sm">{error}</p>
            <Button variant="outline" onClick={() => navigate('/')}>
              {t.goHome}
            </Button>
          </>
        ) : !preview ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">{t.loading}</span>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-xl font-bold text-foreground">{t.inviteTitle}</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {t.inviteDesc
                  .replace('{username}', preview.invitedBy)
                  .replace('{song}', preview.songTitle)}
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 text-left space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t.songLabel}</p>
              <p className="font-semibold text-foreground">{preview.songTitle}</p>
              <p className="text-xs text-muted-foreground">
                {t.invitedBy}: {preview.invitedBy}
              </p>
            </div>

            <Button
              className="w-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold border-0 gap-2"
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {t.joinSong}
            </Button>

            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              {t.goHome}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
