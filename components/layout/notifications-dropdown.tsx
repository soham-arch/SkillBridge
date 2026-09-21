'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Circle } from 'lucide-react';
import { fetchNotifications, readNotification, readAllNotifications } from '@/lib/services/notifications';
import { subscribeMarketplaceStore } from '@/lib/store/marketplace-store';
import { NotificationItem } from '@/types';

interface NotificationsDropdownProps {
  userId: string;
}

export function NotificationsDropdown({ userId }: NotificationsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    fetchNotifications(userId).then(setNotifications).catch(console.error);
    const unsubscribe = subscribeMarketplaceStore(() => {
      fetchNotifications(userId).then(setNotifications).catch(console.error);
    });
    return unsubscribe;
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
        aria-label="View notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-border bg-white shadow-2xl p-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-2">
              <span className="text-sm font-bold text-gray-900">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => readAllNotifications(userId)}
                  className="flex items-center gap-1 text-xs font-semibold text-[#004ac6] hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {notifications.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">No notifications yet</p>
              ) : (
                notifications.map((item) => (
                  <Link
                    key={item.id}
                    href={item.link || '#'}
                    onClick={() => {
                      readNotification(item.id);
                      setOpen(false);
                    }}
                    className={`block rounded-xl p-3 text-xs transition-colors border ${
                      !item.read
                        ? 'bg-blue-50/50 border-blue-100 hover:bg-blue-50'
                        : 'bg-white border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-gray-900 flex items-center gap-1.5">
                        {!item.read && <Circle className="h-2 w-2 fill-[#004ac6] text-[#004ac6]" />}
                        {item.title}
                      </p>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="mt-1 text-gray-600 line-clamp-2">{item.message}</p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
