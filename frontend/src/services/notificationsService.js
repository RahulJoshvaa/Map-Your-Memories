/**
 * Notifications API service.
 * Connects to /api/notifications backend endpoints.
 */
import { apiClient } from './api/client';

export const notificationsService = {
  /**
   * Fetch all notifications for the authenticated user.
   * Returns { notifications: [], unread_count: N }
   */
  async getNotifications() {
    return apiClient.get('/api/notifications');
  },

  /**
   * Mark a single notification as read.
   */
  async markRead(notificationId) {
    return apiClient.patch(`/api/notifications/${notificationId}/read`);
  },

  /**
   * Mark all notifications as read.
   */
  async markAllRead() {
    return apiClient.post('/api/notifications/read-all');
  },

  /**
   * Accept or decline a collaboration invitation for a pin.
   */
  async respondToInvite(pinId, accept) {
    return apiClient.post(`/api/pins/${pinId}/invitation/${accept ? 'accept' : 'reject'}`);
  },
};

/**
 * Validate a collaborator email exists in the system.
 * Returns user { id, name, email } if found.
 * Throws an Error with a user-friendly message if not found.
 */
export async function lookupUserByEmail(email) {
  return apiClient.get(`/api/auth/lookup-user?email=${encodeURIComponent(email)}`);
}
