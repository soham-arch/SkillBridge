import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/store/marketplace-store';
import { NotificationItem } from '@/types';

export async function fetchNotifications(userId: string): Promise<NotificationItem[]> {
  return getUserNotifications(userId);
}

export async function readNotification(id: string): Promise<void> {
  markNotificationRead(id);
}

export async function readAllNotifications(userId: string): Promise<void> {
  markAllNotificationsRead(userId);
}
