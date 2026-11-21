import { useState } from 'react';
import { UserPlus, Check, X, UserMinus, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFriends } from '@/context/FriendsContext';
import { useUILanguage } from '@/context/UILanguageContext';
import { Friend, FriendRequest } from '@/types';
import { toast } from 'sonner';
import { getAvatarUrl } from '@/components/profile/ProfileModal';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function FriendsModal({ open, onClose }: Props) {
  const { t } = useUILanguage();
  const { friends, requests, sendRequest, acceptRequest, declineRequest, unfriend } = useFriends();

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [confirmUnfriendId, setConfirmUnfriendId] = useState<string | null>(null);

  async function handleAdd() {
    const val = email.trim();
    if (!val) return;
    setSending(true);
    setError('');
    try {
      await sendRequest(val);
      toast.success(t.friendRequestSent.replace('{username}', val));
      setEmail('');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '';
      if (msg.toLowerCase().includes('not found')) {
        setError(t.errNoUserFound);
      } else if (msg.toLowerCase().includes('pending')) {
        setError(t.errRequestAlreadySent);
      } else if (msg.toLowerCase().includes('already')) {
        setError(t.errAlreadyFriends);
      } else if (msg.toLowerCase().includes('yourself')) {
        setError(t.errOwnAccount);
      } else {
        setError(t.errRequestFailed);
      }
    } finally {
      setSending(false);
    }
  }

  const onlineFriends = friends.filter(f => f.online);
  const offlineFriends = friends.filter(f => !f.online);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setEmail(''); setError(''); setConfirmUnfriendId(null); onClose(); } }}>
      <DialogContent className="sm:max-w-sm max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
          <DialogTitle>{t.friendsTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* ── Add by email ─────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{t.findFriends}</p>
            <p className="text-xs text-muted-foreground">{t.addFriendDesc}</p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder={t.emailPlaceholder}
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className="h-9 flex-1"
                disabled={sending}
              />
              <Button
                onClick={handleAdd}
                disabled={!email.trim() || sending}
                className="h-9 px-3 bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold border-0 gap-1.5 flex-shrink-0"
              >
                {sending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <UserPlus className="w-4 h-4" />}
                {t.sendRequest}
              </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          {/* ── Pending requests ─────────────────────────────── */}
          {requests.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{t.friendRequests}</p>
                <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-400 text-gray-900 rounded-full text-[10px] font-bold flex-shrink-0">
                  {requests.length}
                </span>
              </div>
              <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                {requests.map((req: FriendRequest) => (
                  <div key={req.id} className="flex items-center gap-3 px-3 py-3">
                    <img
                      src={getAvatarUrl(req.requesterAvatar, req.requesterUsername)}
                      alt={req.requesterUsername}
                      className="w-8 h-8 rounded-full border border-border object-cover flex-shrink-0"
                    />
                    <span className="flex-1 text-sm font-medium truncate">{req.requesterUsername}</span>
                    <button
                      onClick={() => acceptRequest(req.id).then(() => toast.success(t.friendAdded))}
                      className="w-8 h-8 rounded-lg bg-amber-400 hover:bg-amber-500 flex items-center justify-center transition-colors flex-shrink-0"
                    >
                      <Check className="w-4 h-4 text-gray-900" />
                    </button>
                    <button
                      onClick={() => declineRequest(req.id)}
                      className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Friends list ─────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {t.friendsList}{friends.length > 0 && ` (${friends.length})`}
            </p>

            {friends.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-8 text-center">
                <p className="text-sm text-muted-foreground">{t.noFriendsYet}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{t.noFriendsHint}</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                {[...onlineFriends, ...offlineFriends].map((f: Friend) => (
                  <div key={f.id} className="flex items-center gap-3 px-3 py-3 min-h-[56px]">
                    {confirmUnfriendId === f.id ? (
                      /* Confirmation row */
                      <>
                        <span className="flex-1 text-sm text-foreground">{t.confirmUnfriend}</span>
                        <button
                          onClick={() => { unfriend(f.id); toast.success(t.unfriended); setConfirmUnfriendId(null); }}
                          className="h-7 px-3 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold transition-colors flex-shrink-0"
                        >
                          {t.confirmYes}
                        </button>
                        <button
                          onClick={() => setConfirmUnfriendId(null)}
                          className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </>
                    ) : (
                      /* Normal row */
                      <>
                        <div className="relative flex-shrink-0">
                          <img
                            src={getAvatarUrl(f.avatar, f.username)}
                            alt={f.username}
                            className="w-8 h-8 rounded-full border border-border object-cover"
                          />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                              f.online ? 'bg-green-500' : 'bg-muted-foreground/30'
                            }`}
                          />
                        </div>
                        <span className="flex-1 text-sm font-medium truncate">{f.username}</span>
                        {f.online && (
                          <span className="text-[11px] text-green-600 dark:text-green-400 font-medium">
                            {t.online}
                          </span>
                        )}
                        <button
                          onClick={() => setConfirmUnfriendId(f.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors flex-shrink-0"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
