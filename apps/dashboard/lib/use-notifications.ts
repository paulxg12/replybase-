import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

export interface Notification {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string | null;
}

export function useNotifications(pollingIntervalMs = 5000) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPolling, setIsPolling] = useState(true);

  // Get recent notifications
  const recentQuery = trpc.notifications.getRecent.useQuery(
    { limit: 10 },
    { enabled: isPolling }
  );

  // Get unread count
  const unreadQuery = trpc.notifications.getUnreadCount.useQuery(
    undefined,
    { enabled: isPolling }
  );

  // Mark as read mutation
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation();

  // Mark all as read mutation
  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation();

  // Update notifications when query completes
  useEffect(() => {
    if (recentQuery.data) {
      setNotifications(recentQuery.data.notifications);
    }
  }, [recentQuery.data]);

  // Update unread count when query completes
  useEffect(() => {
    if (unreadQuery.data) {
      setUnreadCount(unreadQuery.data.unreadCount);
    }
  }, [unreadQuery.data]);

  // Set up polling interval
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(() => {
      // Refetch both queries
      recentQuery.refetch();
      unreadQuery.refetch();
    }, pollingIntervalMs);

    return () => clearInterval(interval);
  }, [isPolling, pollingIntervalMs, recentQuery, unreadQuery]);

  const markAsRead = async (notificationId: string) => {
    await markAsReadMutation.mutateAsync({ notificationId });
    // Refetch to update UI
    await recentQuery.refetch();
    await unreadQuery.refetch();
  };

  const markAllAsRead = async () => {
    await markAllAsReadMutation.mutateAsync();
    // Refetch to update UI
    await recentQuery.refetch();
    await unreadQuery.refetch();
  };

  const startPolling = () => setIsPolling(true);
  const stopPolling = () => setIsPolling(false);

  return {
    notifications,
    unreadCount,
    isPolling,
    markAsRead,
    markAllAsRead,
    startPolling,
    stopPolling,
    isLoading: recentQuery.isLoading,
  };
}
