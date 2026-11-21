import { useState } from 'react';
import { UserPlus, Users, History, ChevronDown, ChevronUp, X, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUILanguage } from '@/context/UILanguageContext';
import { useFriends } from '@/context/FriendsContext';
import { useCollaborators, useInviteFriend, useRemoveCollaborator, useLeaveSong } from '@/hooks/useCollaboration';
import { getAvatarUrl } from '@/components/profile/ProfileModal';
import { useAuth } from '@/context/AuthContext';
import { Collaborator } from '@/types';
import { toast } from 'sonner';
import { VersionHistory } from './VersionHistory';

interface InvitePanelProps {
  songId: string;
  isOwner: boolean;
  onClose: () => void;
}

export function InvitePanel({ songId, isOwner, onClose }: InvitePanelProps) {
  const { t } = useUILanguage();
  const { user } = useAuth();
  const { friends } = useFriends();
  const { data: collaborators = [] } = useCollaborators(songId);
  const inviteFriend = useInviteFriend(songId);
  const removeCollaborator = useRemoveCollaborator(songId);
  const leaveSong = useLeaveSong(songId);
  const [showHistory, setShowHistory] = useState(false);

  const collaboratorIds = new Set(collaborators.map((c: Collaborator) => c.userId));
  const invitableFriends = friends.filter(f => !collaboratorIds.has(f.friendId));

  async function handleRemove(userId: string, username: string) {
    try {
      await removeCollaborator.mutateAsync(userId);
      toast.success(`${username} removed`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to remove';
      toast.error(msg);
    }
  }

  async function handleLeave() {
    if (!user) return;
    try {
      await leaveSong.mutateAsync(user.id);
      toast.success(t.inviteDeclined);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to leave song';
      toast.error(msg);
    }
  }

  async function handleInvite(friendId: string, username: string) {
    try {
      await inviteFriend.mutateAsync(friendId);
      toast.success(`${username} added as collaborator`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to invite';
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-4">
      {/* Current collaborators */}
      {collaborators.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {t.collaborators} ({collaborators.filter((c: Collaborator) => c.status !== 'pending').length})
          </p>
          <div className="space-y-1.5">
            {collaborators.map((c: Collaborator) => (
              <div key={c.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${c.status === 'pending' ? 'bg-accent/20 opacity-60' : 'bg-accent/40'}`}>
                <img
                  src={getAvatarUrl(c.avatar, c.username)}
                  alt={c.username}
                  className="w-6 h-6 rounded-full border border-border object-cover"
                />
                <span className="text-sm font-medium flex-1">{c.username}</span>
                {c.status === 'pending' ? (
                  <span className="text-xs text-amber-600 font-medium">{t.pendingCollaborator}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">{c.role}</span>
                )}
                {isOwner && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs px-2 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive ml-1"
                    onClick={() => handleRemove(c.userId, c.username)}
                    disabled={removeCollaborator.isPending}
                  >
                    <X className="w-3 h-3 mr-1" />
                    {t.removeCollaborator}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite friends — owner only */}
      {isOwner && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {t.inviteToSong}
          </p>

          {friends.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 py-5 text-center">
              <Users className="w-7 h-7 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{t.noFriendsYet}</p>
              <p className="text-xs text-muted-foreground/60">{t.noFriendsInviteHint}</p>
            </div>
          ) : invitableFriends.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">
              {t.allFriendsAdded}
            </p>
          ) : (
            <div className="space-y-1.5">
              {invitableFriends.map(f => (
                <div key={f.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent/50">
                  <img
                    src={getAvatarUrl(f.avatar, f.username)}
                    alt={f.username}
                    className="w-6 h-6 rounded-full border border-border object-cover"
                  />
                  <span className="text-sm font-medium flex-1">{f.username}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs gap-1 px-2"
                    onClick={() => handleInvite(f.friendId, f.username)}
                    disabled={inviteFriend.isPending}
                  >
                    <UserPlus className="w-3 h-3" />
                    {t.addFriend}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Version history */}
      <div>
        <button
          onClick={() => setShowHistory(h => !h)}
          className="flex items-center gap-1.5 w-full text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
        >
          <History className="w-3.5 h-3.5" />
          {t.versionHistory}
          {showHistory
            ? <ChevronUp className="w-3.5 h-3.5 ml-auto" />
            : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
        </button>
        {showHistory && (
          <div className="mt-2">
            <VersionHistory songId={songId} />
          </div>
        )}
      </div>

      {!isOwner && collaborators.some((c: Collaborator) => c.userId === user?.id && c.status === 'accepted') && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive gap-1.5"
          onClick={handleLeave}
          disabled={leaveSong.isPending}
        >
          <LogOut className="w-3.5 h-3.5" />
          {t.leaveSong}
        </Button>
      )}

      <Button variant="ghost" size="sm" className="w-full" onClick={onClose}>
        {t.cancel}
      </Button>
    </div>
  );
}
