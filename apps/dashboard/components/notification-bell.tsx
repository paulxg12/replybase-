"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/lib/use-notifications";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/use-toast";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications(5000);

  const handleNotificationClick = (notification: (typeof notifications)[0]) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate if action URL exists
    if (notification.actionUrl) {
      setOpen(false);
      router.push(notification.actionUrl);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error("Failed to mark all as read");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "sync_complete":
        return "✅";
      case "new_chat":
        return "💬";
      case "payment_failed":
        return "⚠️";
      case "widget_install":
        return "🚀";
      default:
        return "📢";
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-4 py-2">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              <CheckCheck size={14} />
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No notifications yet
          </div>
        ) : (
          <>
            <DropdownMenuSeparator />
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "flex flex-col gap-1 px-4 py-3 cursor-pointer",
                    !notification.read && "bg-blue-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      <span className="text-lg">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            !notification.read && "text-blue-900"
                          )}
                        >
                          {notification.title}
                        </p>
                        {notification.description && (
                          <p className="text-xs text-gray-600 mt-0.5">
                            {notification.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {!notification.read && (
                      <Check size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 ml-7">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </DropdownMenuItem>
              ))}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
