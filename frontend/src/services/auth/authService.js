/**
 * Map Your Memories - Authentication API Service
 * Handles user registration, login, profile retrieval, session persistence, and logout.
 */
import { apiClient } from '../api/client';

const TOKEN_KEY = 'mym_auth_token';
const USER_KEY = 'mym_auth_user';

export const authService = {
  /**
   * Register a new user account.
   */
  async register({ name, email, password, confirmPassword }) {
    const data = await apiClient.post('/api/auth/register', {
      name,
      email,
      password,
      confirm_password: confirmPassword,
    });
    if (data?.access_token) {
      this.setSession(data.access_token, data.user);
    }
    return data;
  },

  /**
   * Log in with email and password.
   */
  async login({ email, password }) {
    const data = await apiClient.post('/api/auth/login', {
      email,
      password,
    });
    if (data?.access_token) {
      this.setSession(data.access_token, data.user);
    }
    return data;
  },

  /**
   * Fetch current authenticated user's profile from the backend.
   */
  async getCurrentUser() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const user = await apiClient.get('/api/auth/me');
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    } catch (err) {
      // If unauthorized or token expired, invalidate session
      if (err?.status === 401) {
        this.clearSession();
      }
      throw err;
    }
  },

  /**
   * Log out of current session.
   */
  async logout() {
    try {
      await apiClient.post('/api/auth/logout', {});
    } catch {
      // Ignore network errors on logout
    } finally {
      this.clearSession();
    }
  },

  /**
   * Get stored JWT token.
   */
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Check if a token is stored locally.
   */
  hasToken() {
    return Boolean(this.getToken());
  },

  /**
   * Get cached user profile.
   */
  getCachedUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  /**
   * Store active session.
   */
  setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },

  /**
   * Invalidate and clear stored session.
   */
  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
