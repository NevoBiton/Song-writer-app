import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useSocket } from '@/context/SocketContext';
import { Friend, FriendRequest } from '@/types';

interface FriendsContextValue {
  friends: Friend[];
  requests: FriendRequest[];
  pendingCount: number;
  loading: boolean;
  refreshFriends: () => void;
  refreshRequests: () => void;
  sendRequest: (username: string) => Promise<void>;
  acceptRequest: (id: string) => Promise<void>;
  declineRequest: (id: string) => Promise<void>;
  unfriend: (id: string) => Promise<void>;
}

const FriendsContext = createContext<FriendsContextValue | null>(null);

export function FriendsProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);

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
    const { data } = await api.get<FriendRequest[]>('/friends/requests');
    setRequests(data);
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

    socket.on('friend_request', onFriendRequest);
    socket.on('friend_accepted', onFriendAccepted);
    socket.on('friend_online', onFriendOnline);
    socket.on('friend_offline', onFriendOffline);
    socket.on('friend_removed', onFriendRemoved);
    socket.on('new_notification', onNewNotification);

    return () => {
      socket.off('friend_request', onFriendRequest);
      socket.off('friend_accepted', onFriendAccepted);
      socket.off('friend_online', onFriendOnline);
      socket.off('friend_offline', onFriendOffline);
      socket.off('friend_removed', onFriendRemoved);
      socket.off('new_notification', onNewNotification);
    };
  }, [socket, refreshFriends, queryClient]);

  const sendRequest = useCallback(async (email: string) => {
    await api.post('/friends/request', { email });
  }, []);

  const acceptRequest = useCallback(async (id: string) => {
    await api.post(`/friends/${id}/accept`);
    setRequests(prev => prev.filter(r => r.id !== id));
    await refreshFriends();
  }, [refreshFriends]);

  const declineRequest = useCallback(async (id: string) => {
    await api.post(`/friends/${id}/decline`);
    setRequests(prev => prev.filter(r => r.id !== id));
  }, []);

  const unfriend = useCallback(async (id: string) => {
    await api.delete(`/friends/${id}`);
    setFriends(prev => prev.filter(f => f.id !== id));
  }, []);

  return (
    <FriendsContext.Provider value={{
      friends,
      requests,
      pendingCount: requests.length,
      loading,
      refreshFriends,
      refreshRequests,
      sendRequest,
      acceptRequest,
      declineRequest,
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
