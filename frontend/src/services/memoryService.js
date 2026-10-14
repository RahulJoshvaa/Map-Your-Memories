/**
 * Memory Service Layer
 * 
 * Provides an abstracted interface for memory operations.
 * Currently backed by localStorage + in-memory mock data.
 * Structure matches future FastAPI endpoints:
 * - GET /pins -> fetchMemories()
 * - POST /pins -> createMemory()
 * - GET /pins/:id -> getMemoryById()
 * - PUT /pins/:id/favorite -> toggleFavorite()
 * - GET /pins/search?q=... -> searchMemories()
 */

import { INITIAL_MEMORIES, CURRENT_USER } from '../data/mockMemories';

const STORAGE_KEY = 'mym_memories_data_v1';

// Initialize storage if needed
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Could not read from localStorage', e);
  }
  return [...INITIAL_MEMORIES];
}

function saveToStorage(memories) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  } catch (e) {
    console.warn('Could not save to localStorage', e);
  }
}

let memoryCache = loadFromStorage();

/**
 * Fetch all memories accessible to the current user
 * @returns {Promise<Array>}
 */
export async function fetchMemories() {
  // Simulate slight network latency for realistic feel
  await new Promise((r) => setTimeout(r, 60));
  return [...memoryCache];
}

/**
 * Search memories across title, description, locationName, and tags
 * Designed to later route to FastAPI AI natural-language search
 * @param {string} query
 * @param {Array} memories
 * @returns {Array}
 */
export function filterMemoriesByQuery(query, memories = memoryCache) {
  if (!query || !query.trim()) return memories;

  const q = query.trim().toLowerCase();
  return memories.filter((mem) => {
    const titleMatch = mem.title.toLowerCase().includes(q);
    const descMatch = mem.description.toLowerCase().includes(q);
    const locMatch = (mem.locationName || '').toLowerCase().includes(q);
    const tagMatch = (mem.tags || []).some((tag) => tag.toLowerCase().includes(q));
    const ownerMatch = (mem.owner?.name || '').toLowerCase().includes(q);
    return titleMatch || descMatch || locMatch || tagMatch || ownerMatch;
  });
}

/**
 * Filter memories owned by current user (My Pins)
 * @param {string} [titleQuery]
 * @param {Array} memories
 * @returns {Array}
 */
export function getMyPins(titleQuery = '', memories = memoryCache) {
  const owned = memories.filter(
    (m) => m.accessType === 'owner' || m.permission === 'OWNER'
  );
  if (!titleQuery || !titleQuery.trim()) return owned;
  const q = titleQuery.trim().toLowerCase();
  return owned.filter((m) => m.title.toLowerCase().includes(q));
}

/**
 * Filter memories shared by others
 * @param {Array} memories
 * @returns {Array}
 */
export function getSharedWithMe(memories = memoryCache) {
  return memories.filter(
    (m) => m.accessType === 'shared' || m.permission !== 'OWNER'
  );
}

/**
 * Filter favorite memories
 * @param {Array} memories
 * @returns {Array}
 */
export function getFavoriteMemories(memories = memoryCache) {
  return memories.filter((m) => m.isFavorite);
}

/**
 * Get recently accessed memories
 * @param {Array} memories
 * @returns {Array}
 */
export function getRecentMemories(memories = memoryCache) {
  return [...memories].sort((a, b) => {
    // Sort with favorites/recent timestamps
    return (a.lastAccessed || '').localeCompare(b.lastAccessed || '');
  });
}

/**
 * Group memories by geographic location (cluster duplicate/close coordinates)
 * Returns a list of clusters:
 * {
 *   key: "11.4102,76.6950",
 *   latitude: 11.4102,
 *   longitude: 76.6950,
 *   locationName: "Ooty, Tamil Nadu",
 *   memories: [...],
 *   count: 3
 * }
 */
export function groupMemoriesByLocation(memories = memoryCache) {
  const groups = new Map();

  memories.forEach((mem) => {
    // Round to 3 decimal places (~110m) to group co-located pins nicely
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
 * Toggle favorite status
 * @param {string} memoryId
 * @returns {Promise<Object>}
 */
export async function toggleFavoriteMemory(memoryId) {
  memoryCache = memoryCache.map((m) => {
    if (m.id === memoryId) {
      return { ...m, isFavorite: !m.isFavorite };
    }
    return m;
  });
  saveToStorage(memoryCache);
  return memoryCache.find((m) => m.id === memoryId);
}

/**
 * Create a new memory pin
 * @param {Object} memoryData
 * @returns {Promise<Object>}
 */
export async function createMemory(memoryData) {
  await new Promise((r) => setTimeout(r, 120));

  const newMemory = {
    id: `mem-${Date.now()}`,
    title: memoryData.title || 'Untitled Memory',
    description: memoryData.description || '',
    latitude: parseFloat(memoryData.latitude),
    longitude: parseFloat(memoryData.longitude),
    locationName: memoryData.locationName || 'Pin Location',
    date: memoryData.date || new Date().toISOString().split('T')[0],
    accessType: 'owner',
    permission: 'OWNER',
    isFavorite: false,
    lastAccessed: 'Just now',
    owner: {
      id: CURRENT_USER.id,
      name: CURRENT_USER.name,
      avatar: CURRENT_USER.avatar,
      email: CURRENT_USER.email,
    },
    mediaCount: {
      photos: memoryData.mediaCount?.photos || 1,
      videos: memoryData.mediaCount?.videos || 0,
    },
    tags: Array.isArray(memoryData.tags)
      ? memoryData.tags
      : (memoryData.tags || '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
    color: '#ffb72b',
    category: memoryData.category || 'Personal',
  };

  memoryCache = [newMemory, ...memoryCache];
  saveToStorage(memoryCache);
  return newMemory;
}

/**
 * Reset memory cache to default mock data
 */
export function resetMemoriesToDefault() {
  memoryCache = [...INITIAL_MEMORIES];
  saveToStorage(memoryCache);
  return memoryCache;
}
