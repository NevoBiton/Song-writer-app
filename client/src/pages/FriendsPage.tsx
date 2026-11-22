import { useState } from 'react';
import { Search, UserPlus, Check, X, UserMinus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFriends } from '@/context/FriendsContext';
import { useUILanguage } from '@/context/UILanguageContext';
import { Friend, FriendRequest } from '@/types';
import api from '@/lib/api';
import { toast } from 'sonner';
import { getAvatarUrl } from '@/components/profile/ProfileModal';

interface UserResult {
  id: string;
  username: string;
  avatar?: string;
}

function OnlineDot({ online }: { online: boolean }) {
  return (
    <span
      className={`w-2.5 h-2.5 rounded-full border-2 border-background ${online ? 'bg-green-500' : 'bg-muted-foreground/40'}`}
    />
  );
}

function FriendRow({ friend, onUnfriend }: { friend: Friend; onUnfriend: (id: string) => void }) {
  const { t } = useUILanguage();
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-accent/50 transition-colors">
      <div className="relative flex-shrink-0">
        <img
          src={getAvatarUrl(friend.avatar, friend.username)}
          alt={friend.username}
          className="w-9 h-9 rounded-full border border-border object-cover"
        />
        <span className="absolute -bottom-0.5 -right-0.5">
          <OnlineDot online={friend.online} />
        </span>
      </div>
      <span className="flex-1 font-medium text-sm">{friend.username}</span>
      {friend.online && (
        <span className="text-xs text-green-600 dark:text-green-400 font-medium">{t.online}</span>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="w-7 h-7 p-0 text-muted-foreground hover:text-destructive"
        onClick={() => onUnfriend(friend.id)}
        title={t.confirmUnfriend}
      >
        <UserMinus className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

function RequestRow({
  req,
  onAccept,
  onDecline,
}: {
  req: FriendRequest;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const { t } = useUILanguage();
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-accent/50">
      <img
        src={getAvatarUrl(req.requesterAvatar, req.requesterUsername)}
        alt={req.requesterUsername}
        className="w-9 h-9 rounded-full border border-border object-cover flex-shrink-0"
      />
      <span className="flex-1 font-medium text-sm">{req.requesterUsername}</span>
      <Button
        variant="ghost"
        size="sm"
        className="w-7 h-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
        onClick={() => onAccept(req.id)}
        title={t.accept}
      >
        <Check className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="w-7 h-7 p-0 text-muted-foreground hover:text-destructive"
        onClick={() => onDecline(req.id)}
        title={t.reject}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default function FriendsPage() {
  const { t } = useUILanguage();
  const { friends, requests, loading, sendRequest, acceptRequest, declineRequest, unfriend } =
    useFriends();

  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  async function handleSearch(q: string) {
    setSearchQ(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await api.get<UserResult[]>('/friends/search', { params: { q } });
      setSearchResults(data);
    } catch {
      toast.error(t.searchError);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleSendRequest(username: string, userId: string) {
    try {
      await sendRequest(userId);
      setSentTo(prev => new Set(prev).add(userId));
      toast.success(t.friendRequestSent.replace('{username}', username));
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) return; // global interceptor already showed a toast
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t.friendRequestFailed;
      toast.error(msg);
    }
  }

  async function handleAccept(id: string) {
    try {
      await acceptRequest(id);
      toast.success(t.friendAdded);
    } catch {
      toast.error(t.friendRequestFailed);
    }
  }

  async function handleDecline(id: string) {
    try {
      await declineRequest(id);
    } catch {
      toast.error(t.friendRequestFailed);
    }
  }

  async function handleUnfriend(id: string) {
    await unfriend(id);
    toast.success(t.unfriended);
  }

  const onlineFriends = friends.filter(f => f.online);
  const offlineFriends = friends.filter(f => !f.online);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t.friendsTitle}</h1>

      {/* Search */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">{t.findFriends}</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t.searchUserPlaceholder}
            value={searchQ}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>

        {searching && (
          <p className="text-sm text-muted-foreground px-1">{t.searching}</p>
        )}

        {searchResults.length > 0 && (
          <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
            {searchResults.map(u => {
              const alreadyFriend = friends.some(f => f.friendId === u.id);
              const sent = sentTo.has(u.id);
              return (
                <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50">
                  <img
                    src={getAvatarUrl(u.avatar, u.username)}
                    alt={u.username}
                    className="w-8 h-8 rounded-full border border-border object-cover flex-shrink-0"
                  />
                  <span className="flex-1 text-sm font-medium">{u.username}</span>
                  {alreadyFriend ? (
                    <span className="text-xs text-muted-foreground">{t.alreadyFriends}</span>
                  ) : sent ? (
                    <span className="text-xs text-muted-foreground">{t.requestSent}</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleSendRequest(u.username, u.id)}
                    >
                      <UserPlus className="w-3 h-3" />
                      {t.addFriend}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Incoming requests */}
      {requests.length > 0 && (
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t.friendRequests} ({requests.length})
          </h2>
          <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
            {requests.map(req => (
              <RequestRow
                key={req.id}
                req={req}
                onAccept={handleAccept}
                onDecline={handleDecline}
              />
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t.friendsList} ({friends.length})
        </h2>

        {loading ? (
          <p className="text-sm text-muted-foreground px-1">{t.loading}</p>
        ) : friends.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1">{t.noFriendsYet}</p>
        ) : (
          <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
            {onlineFriends.map(f => (
              <FriendRow key={f.id} friend={f} onUnfriend={handleUnfriend} />
            ))}
            {offlineFriends.map(f => (
              <FriendRow key={f.id} friend={f} onUnfriend={handleUnfriend} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
