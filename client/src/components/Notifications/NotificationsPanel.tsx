import { useState } from 'react';
import { Check, X, Bell, UserPlus, Music2, FileText, CheckCircle, XCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUILanguage } from '@/context/UILanguageContext';
import { useFriends } from '@/context/FriendsContext';
import {
  useNotifications, useMarkRead, useMarkAllRead, useDeleteNotification,
  AppNotification,
} from '@/hooks/useNotifications';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';

interface NotificationsPanelProps {
  onClose: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotificationIcon({ type, acted }: { type: AppNotification['type']; acted?: boolean }) {
  const cls = 'w-4 h-4 flex-shrink-0';
  if (acted) return <CheckCircle className={`${cls} text-green-500`} />;
  switch (type) {
    case 'friend_request':
    case 'friend_accepted':
      return <Users className={`${cls} text-blue-500`} />;
    case 'collaborator_invited':
    case 'collaborator_joined':
      return <Music2 className={`${cls} text-amber-500`} />;
    case 'proposal_submitted':
      return <FileText className={`${cls} text-purple-500`} />;
    case 'proposal_accepted':
      return <CheckCircle className={`${cls} text-green-500`} />;
    case 'proposal_rejected':
      return <XCircle className={`${cls} text-red-500`} />;
  }
}

function NotificationText({ notif }: { notif: AppNotification }) {
  const { t } = useUILanguage();
  const d = notif.data;

  switch (notif.type) {
    case 'friend_request':
      return <><span className="font-semibold">{d.fromUsername as string}</span> {t.notifFriendRequest}</>;
    case 'friend_accepted':
      return <><span className="font-semibold">{d.byUsername as string}</span> {t.notifFriendAccepted}</>;
    case 'collaborator_invited':
      return <><span className="font-semibold">{d.invitedByUsername as string}</span> {t.notifCollabInvited} &ldquo;{d.songTitle as string}&rdquo;</>;
    case 'collaborator_joined':
      return <><span className="font-semibold">{d.joinedUsername as string}</span> {t.notifCollabJoined} &ldquo;{d.songTitle as string}&rdquo;</>;
    case 'proposal_submitted':
      return <><span className="font-semibold">{d.proposedByUsername as string}</span> {t.notifProposalSubmitted} &ldquo;{d.songTitle as string}&rdquo;</>;
    case 'proposal_accepted':
      return <>{t.notifProposalAccepted} &ldquo;{d.songTitle as string}&rdquo; {t.notifProposalAcceptedSuffix}</>;
    case 'proposal_rejected':
      return <>{t.notifProposalRejected} &ldquo;{d.songTitle as string}&rdquo; {t.notifProposalRejectedSuffix}</>;
  }
}

function NotificationItem({ notif }: { notif: AppNotification }) {
  const { t } = useUILanguage();
  const { acceptRequest, declineRequest } = useFriends();
  const markRead = useMarkRead();
  const deleteNotif = useDeleteNotification();
  const qc = useQueryClient();
  const [acting, setActing] = useState(false);
  // Track whether the user acted on this item so we can show inline confirmation.
  const [accepted, setAccepted] = useState(false);

  async function handleAcceptFriend() {
    setActing(true);
    try {
      await acceptRequest(notif.data.friendshipId as string);
      setAccepted(true);
      markRead.mutate(notif.id);
      toast.success(t.friendAdded);
    } catch {
      toast.error(t.errRequestFailed);
      setActing(false);
    }
  }

  async function handleDeclineFriend() {
    setActing(true);
    try {
      await declineRequest(notif.data.friendshipId as string);
      await deleteNotif.mutateAsync(notif.id);
    } catch {
      toast.error(t.errRequestFailed);
      setActing(false);
    }
  }

  async function handleAcceptCollab() {
    setActing(true);
    try {
      await api.post(`/songs/${notif.data.songId}/invite/accept`);
      setAccepted(true);
      markRead.mutate(notif.id);
      qc.invalidateQueries({ queryKey: ['songs'] });
      qc.invalidateQueries({ queryKey: ['collaborators', notif.data.songId as string] });
      toast.success(t.inviteAccepted);
    } catch {
      toast.error(t.errRequestFailed);
      setActing(false);
    }
  }

  async function handleDeclineCollab() {
    setActing(true);
    try {
      await api.post(`/songs/${notif.data.songId}/invite/decline`);
      await deleteNotif.mutateAsync(notif.id);
      toast(t.inviteDeclined);
    } catch {
      toast.error(t.errRequestFailed);
      setActing(false);
    }
  }

  async function handleDismiss() {
    await markRead.mutateAsync(notif.id);
  }

  const isActionable =
    notif.type === 'friend_request' || notif.type === 'collaborator_invited';

  // Accepted confirmation text
  const acceptedLabel =
    notif.type === 'friend_request' ? t.friendAdded : t.inviteAccepted;

  return (
    <div className="flex gap-3 px-4 py-3 border-b border-border last:border-0">
      <div className="mt-0.5">
        <NotificationIcon type={notif.type} acted={accepted} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          <NotificationText notif={notif} />
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(notif.createdAt)}</p>

        {isActionable && !accepted && !notif.isRead && (
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              className="h-6 text-xs px-3 bg-amber-400 hover:bg-amber-500 text-gray-900"
              onClick={notif.type === 'friend_request' ? handleAcceptFriend : handleAcceptCollab}
              disabled={acting}
            >
              <Check className="w-3 h-3 mr-1" />
              {t.accept}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs px-3"
              onClick={notif.type === 'friend_request' ? handleDeclineFriend : handleDeclineCollab}
              disabled={acting}
            >
              {t.reject}
            </Button>
          </div>
        )}

        {isActionable && (accepted || notif.isRead) && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 flex items-center gap-1">
            <Check className="w-3 h-3" />
            {acceptedLabel}
          </p>
        )}
      </div>

      {!isActionable && !notif.isRead && (
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5"
          title="Mark as read"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const { t } = useUILanguage();
  const { data: notifications = [] } = useNotifications();
  const markAllRead = useMarkAllRead();

  const unread = notifications.filter(n => !n.isRead);

  async function handleMarkAllRead() {
    await markAllRead.mutateAsync();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">{t.notificationsTitle}</h3>
          {unread.length > 0 && (
            <span className="w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
              {unread.length > 9 ? '9+' : unread.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unread.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground px-2"
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
            >
              {t.markAllRead}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-6 h-6 p-0 text-muted-foreground"
            onClick={onClose}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-[420px]">
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t.noNotifications}</p>
        ) : (
          notifications.map(n => <NotificationItem key={n.id} notif={n} />)
        )}
      </div>
    </div>
  );
}
