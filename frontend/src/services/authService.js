/**
 * Authentication Service Wrapper
 * Re-exports the unified FastAPI authentication service.
 */
import { authService } from './auth/authService';

export async function loginUser(credentials) {
  const result = await authService.login({
    email: credentials.email,
    password: credentials.password,
  });

  return {
    success: true,
    message: 'Welcome back to Map Your Memories!',
    user: result.user,
    token: result.access_token,
  };
}

export { authService };
