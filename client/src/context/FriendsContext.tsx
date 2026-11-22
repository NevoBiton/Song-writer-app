import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useSocket } from '@/context/SocketContext';
import { Friend, FriendRequest, SentRequest } from '@/types';

interface FriendsContextValue {
  friends: Friend[];
  requests: FriendRequest[];
  sentRequests: SentRequest[];
  pendingCount: number;
  loading: boolean;
  requestsLoaded: boolean;
  refreshFriends: () => void;
  refreshRequests: () => void;
  sendRequest: (email: string) => Promise<void>;
  acceptRequest: (id: string) => Promise<void>;
  declineRequest: (id: string) => Promise<void>;
  cancelRequest: (id: string) => Promise<void>;
  unfriend: (id: string) => Promise<void>;
}

const FriendsContext = createContext<FriendsContextValue | null>(null);

export function FriendsProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestsLoaded, setRequestsLoaded] = useState(false);

  const refreshFriends = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Friend[]>('/friends');
      setFriends(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshRequests = useCallback(async () => {
    const [incoming, sent] = await Promise.all([
      api.get<FriendRequest[]>('/friends/requests'),
      api.get<SentRequest[]>('/friends/sent-requests'),
    ]);
    setRequests(incoming.data);
    setSentRequests(sent.data);
    setRequestsLoaded(true);
  }, []);

  useEffect(() => {
    refreshFriends();
    refreshRequests();
  }, [refreshFriends, refreshRequests]);

  // WebSocket listeners
  useEffect(() => {
    if (!socket) return;

    function onFriendRequest(data: { from: { id: string; username: string; avatar?: string }; friendship: { id: string } }) {
      setRequests(prev => [
        ...prev,
        {
          id: data.friendship.id,
          requesterId: data.from.id,
          requesterUsername: data.from.username,
          requesterAvatar: data.from.avatar,
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    function onFriendAccepted(data: {
      friendship: { id: string; requesterId: string; addresseeId: string; status: string };
      by: { id: string; username: string; avatar?: string };
    }) {
      setFriends(prev => {
        if (prev.some(f => f.id === data.friendship.id)) return prev;
        return [...prev, {
          id: data.friendship.id,
          friendId: data.by.id,
          username: data.by.username,
          avatar: data.by.avatar,
          online: false,
        }];
      });
      // Remove from pending-sent so the sender's list updates in real-time
      setSentRequests(prev => prev.filter(r => r.id !== data.friendship.id));
    }

    function onFriendRequestDeclined(data: { friendshipId: string }) {
      setSentRequests(prev => prev.filter(r => r.id !== data.friendshipId));
    }

    function onFriendOnline(data: { userId: string }) {
      setFriends(prev =>
        prev.map(f => f.friendId === data.userId ? { ...f, online: true } : f),
      );
    }

    function onFriendOffline(data: { userId: string }) {
      setFriends(prev =>
        prev.map(f => f.friendId === data.userId ? { ...f, online: false } : f),
      );
    }

    function onFriendRemoved(data: { friendshipId: string }) {
      setFriends(prev => prev.filter(f => f.id !== data.friendshipId));
    }

    function onNewNotification() {
      // Refresh the notifications query so the bell badge and panel update
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }

    function onCollaboratorRemoved() {
      // This user was removed from (or left) a song — update the songs list so it
      // disappears without a manual refresh
      queryClient.invalidateQueries({ queryKey: ['songs'] });
    }

    socket.on('friend_request', onFriendRequest);
    socket.on('friend_accepted', onFriendAccepted);
    socket.on('friend_request_declined', onFriendRequestDeclined);
    socket.on('friend_online', onFriendOnline);
    socket.on('friend_offline', onFriendOffline);
    socket.on('friend_removed', onFriendRemoved);
    socket.on('new_notification', onNewNotification);
    socket.on('collaborator_removed', onCollaboratorRemoved);

    return () => {
      socket.off('friend_request', onFriendRequest);
      socket.off('friend_accepted', onFriendAccepted);
      socket.off('friend_request_declined', onFriendRequestDeclined);
      socket.off('friend_online', onFriendOnline);
      socket.off('friend_offline', onFriendOffline);
      socket.off('friend_removed', onFriendRemoved);
      socket.off('new_notification', onNewNotification);
      socket.off('collaborator_removed', onCollaboratorRemoved);
    };
  }, [socket, refreshFriends, queryClient]);

  const sendRequest = useCallback(async (email: string) => {
    const { data } = await api.post<{ id: string; addresseeId: string }>(
      '/friends/request', { email }
    );
    // Refresh sent requests to get addressee username
    await refreshRequests();
    return data;
  }, [refreshRequests]);

  const acceptRequest = useCallback(async (id: string) => {
    await api.post(`/friends/${id}/accept`);
    setRequests(prev => prev.filter(r => r.id !== id));
    await refreshFriends();
    // Mark the related notification as read so the bell badge and panel sync
    api.patch(`/notifications/read-by-friendship/${id}`).then(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }).catch(() => {/* best-effort */});
  }, [refreshFriends, queryClient]);

  const declineRequest = useCallback(async (id: string) => {
    await api.post(`/friends/${id}/decline`);
    setRequests(prev => prev.filter(r => r.id !== id));
    // Delete the related notification so it disappears from the panel
    api.delete(`/notifications/by-friendship/${id}`).then(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }).catch(() => {/* best-effort */});
  }, [queryClient]);

  const cancelRequest = useCallback(async (id: string) => {
    await api.delete(`/friends/${id}/cancel`);
    setSentRequests(prev => prev.filter(r => r.id !== id));
  }, []);

  const unfriend = useCallback(async (id: string) => {
    await api.delete(`/friends/${id}`);
    setFriends(prev => prev.filter(f => f.id !== id));
  }, []);

  return (
    <FriendsContext.Provider value={{
      friends,
      requests,
      sentRequests,
      pendingCount: requests.length,
      loading,
      requestsLoaded,
      refreshFriends,
      refreshRequests,
      sendRequest,
      acceptRequest,
      declineRequest,
      cancelRequest,
      unfriend,
    }}>
      {children}
    </FriendsContext.Provider>
  );
}

export function useFriends() {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error('useFriends must be used within FriendsProvider');
  return ctx;
}
