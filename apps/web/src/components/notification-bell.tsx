"use client";

import { useState } from "react";
import { Bell } from "lucide-react";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications] = useState<any[]>([]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded-lg shadow-lg z-50">
          <div className="p-4 border-b">
            <h4 className="font-semibold">Notifications</h4>
          </div>
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No notifications yet
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((n: any) => (
                <div key={n.id} className="p-3 border-b hover:bg-gray-50 cursor-pointer">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.description && <p className="text-xs text-gray-600">{n.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
