/**
 * Utility functions for JWT token handling
 */

/**
 * Decode JWT token without verification (for client-side use only)
 * Note: This does NOT verify the token signature. Only use for reading payload.
 */
export function decodeJWT(token: string): any | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Get permissions from JWT token
 */
export function getPermissionsFromToken(token: string | null): string[] {
  if (!token) return [];
  
  const payload = decodeJWT(token);
  return payload?.permissions || [];
}

