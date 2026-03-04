/**
 * Session management utilities
 * Handles authentication state, token refresh, and session persistence
 */

import { auth } from './firebase';
import { 
  onAuthStateChanged, 
  User,
  getIdToken,
  getIdTokenResult,
} from 'firebase/auth';

export interface SessionInfo {
  user: User | null;
  isAdmin: boolean;
  tokenExpiry: number | null;
}

// Session storage keys
const SESSION_KEY = 'marketflow_session';
const LAST_ACTIVITY_KEY = 'marketflow_last_activity';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

/**
 * Get current session info
 */
export async function getSessionInfo(): Promise<SessionInfo | null> {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    const tokenResult = await getIdTokenResult(user);
    const isAdmin = tokenResult.claims.admin === true;
    
    return {
      user,
      isAdmin,
      tokenExpiry: tokenResult.expirationTime ? new Date(tokenResult.expirationTime).getTime() : null,
    };
  } catch (error) {
    console.error('Error getting session info:', error);
    return null;
  }
}

/**
 * Refresh authentication token
 */
export async function refreshToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    // Force token refresh
    const token = await getIdToken(user, true);
    return token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

/**
 * Check if session is still valid
 */
export function isSessionValid(): boolean {
  const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!lastActivity) return false;
  
  const lastActivityTime = parseInt(lastActivity, 10);
  const now = Date.now();
  
  return (now - lastActivityTime) < SESSION_TIMEOUT;
}

/**
 * Update last activity timestamp
 */
export function updateLastActivity(): void {
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

/**
 * Clear session data
 */
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
}

/**
 * Setup session monitoring
 * Automatically refreshes token before expiry
 */
export function setupSessionMonitoring(): () => void {
  let refreshInterval: NodeJS.Timeout | null = null;
  
  const checkAndRefresh = async () => {
    const user = auth.currentUser;
    if (!user) {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
      }
      return;
    }
    
    try {
      const tokenResult = await getIdTokenResult(user);
      const expiryTime = tokenResult.expirationTime 
        ? new Date(tokenResult.expirationTime).getTime() 
        : null;
      
      if (expiryTime) {
        const now = Date.now();
        const timeUntilExpiry = expiryTime - now;
        
        // Refresh token 5 minutes before expiry
        if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
          await refreshToken();
        }
      }
    } catch (error) {
      console.error('Error in session monitoring:', error);
    }
  };
  
  // Check every minute
  refreshInterval = setInterval(checkAndRefresh, 60 * 1000);
  
  // Initial check
  checkAndRefresh();
  
  // Return cleanup function
  return () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  };
}

/**
 * Monitor auth state changes
 */
export function monitorAuthState(
  onUserChange: (user: User | null) => void
): () => void {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      updateLastActivity();
    } else {
      clearSession();
    }
    onUserChange(user);
  });
  
  return unsubscribe;
}

/**
 * Validate session before sensitive operations
 */
export async function validateSession(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  
  // Check if session is still valid
  if (!isSessionValid()) {
    return false;
  }
  
  // Check if token is still valid
  try {
    const tokenResult = await getIdTokenResult(user);
    const expiryTime = tokenResult.expirationTime 
      ? new Date(tokenResult.expirationTime).getTime() 
      : null;
    
    if (expiryTime && expiryTime < Date.now()) {
      // Token expired, try to refresh
      const newToken = await refreshToken();
      return newToken !== null;
    }
    
    return true;
  } catch (error) {
    console.error('Error validating session:', error);
    return false;
  }
}



