/**
 * Memory Service Layer
 * 
 * Connected to FastAPI backend endpoints:
 * - GET /api/pins
 * - POST /api/pins
 * - GET /api/pins/{pin_id}
 * - DELETE /api/pins/{pin_id}
 * - GET /api/pins/{pin_id}/media
 * - POST /api/pins/{pin_id}/media
 * - DELETE /api/media/{media_id}
 * 
 * Retains helper functions for clustering, formatting, filtering, and local favorites.
 */
import { pinsService } from './pins/pinsService';
import { authService } from './auth/authService';

const FAVORITES_KEY = 'mym_favorites_list';

function getLocalFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalFavorites(favs) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  } catch {}
}

/**
 * Normalizes a backend PinResponse into the UI model.
 */
export function normalizePin(pin) {
  if (!pin) return null;
  const favorites = getLocalFavorites();
  const isFav = favorites.includes(pin.id);

  const mediaList = pin.media || [];
  const photosCount = mediaList.filter((m) => m.file_type === 'image').length;
  const videosCount = mediaList.filter((m) => m.file_type === 'video').length;
  const audioCount = mediaList.filter((m) => m.file_type === 'audio').length;

  const currentUser = authService.getCachedUser() || {};
  const isOwner = pin.owner_id === currentUser.id;
  const accessType = isOwner ? 'owner' : 'shared';
  const permission = isOwner ? 'OWNER' : (pin.permission || 'EDITOR');

  // Format collaborators list
  const collaborators = [];
  if (pin.owner) {
    collaborators.push({
      id: pin.owner.id,
      name: pin.owner.name,
      email: pin.owner.email,
      role: 'Owner',
    });
  } else if (isOwner) {
    collaborators.push({
      id: currentUser.id,
      name: currentUser.name || 'Owner',
      email: currentUser.email || '',
      role: 'Owner',
    });
  }

  if (Array.isArray(pin.collaborators)) {
    pin.collaborators.forEach((c) => {
      collaborators.push({
        id: c.id,
        userId: c.user_id,
        name: c.user?.name || c.user_id,
        email: c.user?.email || '',
        role: c.role || 'Editor',
        status: c.status || 'accepted',
      });
    });
  }

  return {
    id: pin.id,
    title: pin.title,
    description: pin.description || '',
    latitude: pin.latitude,
    longitude: pin.longitude,
    locationName: pin.location_name || 'Pin Location',
    date: pin.event_date || (pin.created_at ? pin.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
    accessType,
    permission,
    isFavorite: isFav,
    visibility: pin.visibility || 'private',
    lastAccessed: 'Recently updated',
    owner: pin.owner || {
      id: pin.owner_id || currentUser.id,
      name: currentUser.name || 'Owner',
      email: currentUser.email || '',
    },
    collaborators,
    mediaCount: {
      photos: photosCount,
      videos: videosCount,
      audios: audioCount,
    },
    media: mediaList,
    tags: pin.tags
      ? (Array.isArray(pin.tags) ? pin.tags : pin.tags.split(',').map((t) => t.trim()).filter(Boolean))
      : [],
    color: isOwner ? '#ffb72b' : '#02a896',
    category: 'Memory',
  };
}

/**
 * Fetch all pins from the backend for the current user.
 */
export async function fetchMemories(searchQuery = '') {
  const backendPins = await pinsService.getPins(searchQuery);
  return (backendPins || []).map(normalizePin);
}

/**
 * Fetch a single pin by ID from backend.
 */
export async function fetchPinById(pinId) {
  const backendPin = await pinsService.getPinById(pinId);
  return normalizePin(backendPin);
}

/**
 * Search memories across title, description, locationName, and tags.
 */
export function filterMemoriesByQuery(query, memories = []) {
  if (!query || !query.trim()) return memories;

  const q = query.trim().toLowerCase();
  return memories.filter((mem) => {
    const titleMatch = (mem.title || '').toLowerCase().includes(q);
    const descMatch = (mem.description || '').toLowerCase().includes(q);
    const locMatch = (mem.locationName || '').toLowerCase().includes(q);
    const tagMatch = (mem.tags || []).some((tag) => tag.toLowerCase().includes(q));
    const ownerMatch = (mem.owner?.name || '').toLowerCase().includes(q);
    return titleMatch || descMatch || locMatch || tagMatch || ownerMatch;
  });
}

/**
 * Filter memories owned by current user (My Pins).
 */
export function getMyPins(titleQuery = '', memories = []) {
  const owned = memories.filter(
    (m) => m.accessType === 'owner' || m.permission === 'OWNER'
  );
  if (!titleQuery || !titleQuery.trim()) return owned;
  const q = titleQuery.trim().toLowerCase();
  return owned.filter((m) => (m.title || '').toLowerCase().includes(q));
}

/**
 * Filter memories shared by others.
 */
export function getSharedWithMe(memories = []) {
  return memories.filter(
    (m) => m.accessType === 'shared' || m.permission !== 'OWNER'
  );
}

/**
 * Filter favorite memories.
 */
export function getFavoriteMemories(memories = []) {
  return memories.filter((m) => m.isFavorite);
}

/**
 * Get recently accessed memories.
 */
export function getRecentMemories(memories = []) {
  return [...memories].sort((a, b) => {
    return (b.date || '').localeCompare(a.date || '');
  });
}

/**
 * Group memories by geographic location (cluster duplicate/close coordinates).
 */
export function groupMemoriesByLocation(memories = []) {
  const groups = new Map();

  memories.forEach((mem) => {
    const latKey = Number(mem.latitude).toFixed(3);
    const lngKey = Number(mem.longitude).toFixed(3);
    const key = `${latKey},${lngKey}`;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        latitude: mem.latitude,
        longitude: mem.longitude,
        locationName: mem.locationName,
        memories: [],
      });
    }

    groups.get(key).memories.push(mem);
  });

  return Array.from(groups.values()).map((cluster) => ({
    ...cluster,
    count: cluster.memories.length,
    isCluster: cluster.memories.length > 1,
  }));
}

/**
 * Toggle favorite status.
 */
export async function toggleFavoriteMemory(memoryId) {
  const favs = getLocalFavorites();
  const exists = favs.includes(memoryId);
  const updated = exists ? favs.filter((id) => id !== memoryId) : [...favs, memoryId];
  saveLocalFavorites(updated);
  return !exists;
}

/**
 * Create a new memory pin on PostgreSQL via FastAPI backend.
 */
export async function createMemory(memoryData) {
  const createdPin = await pinsService.createPin({
    title: memoryData.title,
    description: memoryData.description || '',
    latitude: memoryData.latitude,
    longitude: memoryData.longitude,
    location_name: memoryData.locationName || '',
    event_date: memoryData.date || '',
    visibility: memoryData.visibility || 'private',
    tags: memoryData.tags || '',
  });

  // Upload initial files
  if (memoryData.files && memoryData.files.length > 0) {
    for (const file of memoryData.files) {
      try {
        await pinsService.uploadMedia(createdPin.id, file);
      } catch (err) {
        console.warn(`Failed to upload ${file.name}:`, err);
      }
    }
  }

  // Add collaborators with their roles
  if (memoryData.collaborators && memoryData.collaborators.length > 0) {
    for (const collab of memoryData.collaborators) {
      try {
        await pinsService.addCollaborator(createdPin.id, collab.email, collab.role || 'Editor');
      } catch (err) {
        console.warn(`Failed to add collaborator ${collab.email}:`, err);
      }
    }
  }

  // Retrieve fresh pin with media + collaborator summaries
  return fetchPinById(createdPin.id);
}

/**
 * Delete a memory pin and all its media.
 */
export async function deleteMemoryPin(pinId) {
  return pinsService.deletePin(pinId);
}

/**
 * Upload media to an existing pin.
 */
export async function uploadMediaToPin(pinId, file) {
  return pinsService.uploadMedia(pinId, file);
}

/**
 * Fetch all media for a pin.
 */
export async function fetchPinMedia(pinId) {
  return pinsService.getPinMedia(pinId);
}

/**
 * Delete individual media item.
 */
export async function deleteMediaItem(mediaId) {
  return pinsService.deleteMedia(mediaId);
}

/**
 * Add a collaborator to a pin.
 */
export async function addPinCollaborator(pinId, email, role = 'Editor') {
  return pinsService.addCollaborator(pinId, email, role);
}

/**
 * Remove a collaborator from a pin.
 */
export async function removePinCollaborator(pinId, collaboratorUserId) {
  return pinsService.removeCollaborator(pinId, collaboratorUserId);
}

