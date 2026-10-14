/**
 * Base API client for Map Your Memories backend.
 * Centralizes all fetch() calls, auth token injection, and error handling.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Retrieve stored auth token from localStorage.
 */
function getToken() {
  return localStorage.getItem('mym_auth_token');
}

/**
 * Core request helper.
 * Automatically injects Authorization header when a token exists.
 * Throws an ApiError on non-2xx responses with the server's detail message.
 */
async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.isMultipart ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.isMultipart ? options.body : (options.body ? JSON.stringify(options.body) : undefined),
  });

  if (response.status === 204) {
    return null; // No Content
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.detail ||
      (Array.isArray(data?.detail) ? data.detail.map((e) => e.msg).join(', ') : null) ||
      `Request failed with status ${response.status}`;
    const error = new Error(typeof message === 'string' ? message : JSON.stringify(message));
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const apiClient = {
  get: (path, options) => request(path, { method: 'GET', ...options }),
  post: (path, body, options) => request(path, { method: 'POST', body, ...options }),
  patch: (path, body, options) => request(path, { method: 'PATCH', body, ...options }),
  delete: (path, options) => request(path, { method: 'DELETE', ...options }),
  upload: (path, formData) =>
    request(path, { method: 'POST', body: formData, isMultipart: true }),
};

export { API_BASE_URL };
