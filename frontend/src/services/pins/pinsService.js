/**
 * Map Your Memories - Pins API Service
 * Handles listing, creating, retrieving, updating, and deleting memory pins.
 */
import { apiClient } from '../api/client';

export const pinsService = {
  /**
   * Fetch all pins for the authenticated user.
   * Supports optional case-insensitive search parameter.
   */
  async getPins(search = '') {
    const query = search && search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    const res = await apiClient.get(`/api/pins${query}`);
    return res?.pins || [];
  },

  /**
   * Fetch a single pin by ID.
   */
  async getPinById(pinId) {
    return apiClient.get(`/api/pins/${pinId}`);
  },

  /**
   * Create a new memory pin.
   * Owner is determined automatically from the authenticated JWT session on the backend.
   */
  async createPin({
    title,
    description = '',
    latitude,
    longitude,
    location_name = '',
    event_date = '',
    visibility = 'private',
    tags = '',
  }) {
    return apiClient.post('/api/pins', {
      title,
      description,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      location_name,
      event_date,
      visibility,
      tags: Array.isArray(tags) ? tags.join(', ') : tags,
    });
  },

  /**
   * Update an existing pin.
   */
  async updatePin(pinId, data) {
    return apiClient.patch(`/api/pins/${pinId}`, data);
  },

  /**
   * Delete a pin and all its associated media files and database records.
   */
  async deletePin(pinId) {
    return apiClient.delete(`/api/pins/${pinId}`);
  },

  /**
   * Get all media files belonging to a specific pin.
   */
  async getPinMedia(pinId) {
    const res = await apiClient.get(`/api/pins/${pinId}/media`);
    return res?.media || [];
  },

  /**
   * Upload a single media file to an existing pin.
   */
  async uploadMedia(pinId, file) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.upload(`/api/pins/${pinId}/media`, formData);
  },

  /**
   * Delete an individual media file from a pin.
   */
  async deleteMedia(mediaId) {
    return apiClient.delete(`/api/media/${mediaId}`);
  },

  /**
   * Add a collaborator to a pin by email.
   */
  async addCollaborator(pinId, email, role = 'Editor') {
    return apiClient.post(`/api/pins/${pinId}/collaborators`, { email, role });
  },

  /**
   * Remove a collaborator from a pin.
   */
  async removeCollaborator(pinId, collaboratorUserId) {
    return apiClient.delete(`/api/pins/${pinId}/collaborators/${collaboratorUserId}`);
  },
};
