/**
 * Mock Auth Service
 * 
 * Provides an abstracted login interface. 
 * Ready to be swapped with FastAPI backend calls (e.g. fetch to /api/auth/login or OAuth2 password flow).
 */

/**
 * Placeholder login function for frontend simulation.
 * Replace implementation with Axios or fetch calling FastAPI endpoint:
 *   const response = await fetch(`${API_BASE_URL}/auth/token`, { ... });
 * 
 * @param {Object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @param {boolean} [credentials.rememberMe]
 * @returns {Promise<{success: boolean, message: string, user?: Object, token?: string}>}
 */
export async function loginUser(credentials) {
  // Simulate network delay for realistic responsiveness
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Simulated successful authentication response
  return {
    success: true,
    message: 'Welcome back to Map Your Memories!',
    user: {
      id: 'usr_mem_9824',
      email: credentials.email,
      name: credentials.email.split('@')[0],
    },
    token: 'jwt_mock_token_map_your_memories_secure_auth',
  };
}
