import { useUser } from '@clerk/clerk-react';
import {
  createOrUpdateUser,
  getUserByClerkId,
  createSession,
  getSessionByToken,
  updateSessionAccess,
  invalidateSession
} from './databaseInit';
import type { User, Session } from '../types';

// User context and session management
export class UserService {
  private static instance: UserService;
  private currentUser: User | null = null;
  private currentSession: Session | null = null;

  private constructor() { }

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  // Initialize user from Clerk authentication
  public async initializeUser(clerkUser: any): Promise<User> {
    try {
      // Create or update user in our database
      const user = await createOrUpdateUser(clerkUser);
      this.currentUser = user;

      // Create a new session
      const sessionToken = this.generateSessionToken();
      const session = await createSession(
        user._id as any, // Convert string to ObjectId
        sessionToken,
        navigator.userAgent,
        '127.0.0.1' // In production, get real IP
      );

      this.currentSession = {
        _id: session._id?.toString(),
        userId: session.userId.toString(),
        sessionToken: session.sessionToken,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        lastAccessedAt: session.lastAccessedAt.toISOString(),
        isActive: session.isActive,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
      };

      // Store session token in localStorage for persistence
      localStorage.setItem('metrrik_session_token', sessionToken);

      return user;
    } catch (error) {
      console.error('Failed to initialize user:', error);
      throw error;
    }
  }

  // Get current user
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Get current session
  public getCurrentSession(): Session | null {
    return this.currentSession;
  }

  // Validate session from stored token
  public async validateStoredSession(): Promise<boolean> {
    try {
      const storedToken = localStorage.getItem('metrrik_session_token');
      if (!storedToken) {
        return false;
      }

      const session = await getSessionByToken(storedToken);
      if (!session || !session.isActive) {
        localStorage.removeItem('metrrik_session_token');
        return false;
      }

      // Check if session is expired
      if (new Date() > session.expiresAt) {
        await invalidateSession(storedToken);
        localStorage.removeItem('metrrik_session_token');
        return false;
      }

      // Update last access time
      await updateSessionAccess(session._id!);

      // Get user data
      const user = await getUserByClerkId(session.userId.toString());
      if (!user) {
        return false;
      }

      this.currentUser = user;
      this.currentSession = {
        _id: session._id?.toString(),
        userId: session.userId.toString(),
        sessionToken: session.sessionToken,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        lastAccessedAt: session.lastAccessedAt.toISOString(),
        isActive: session.isActive,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
      };

      return true;
    } catch (error) {
      console.error('Failed to validate session:', error);
      return false;
    }
  }

  // Logout user
  public async logout(): Promise<void> {
    try {
      if (this.currentSession?.sessionToken) {
        await invalidateSession(this.currentSession.sessionToken);
      }

      localStorage.removeItem('metrrik_session_token');
      this.currentUser = null;
      this.currentSession = null;
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  }

  // Generate a secure session token
  private generateSessionToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Check if user is authenticated
  public isAuthenticated(): boolean {
    return this.currentUser !== null && this.currentSession !== null;
  }

  // Get user ID for database operations
  public getUserId(): string | null {
    return this.currentUser?._id || null;
  }
}

// React hook for user service
export const useUserService = () => {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const userService = UserService.getInstance();

  return {
    userService,
    clerkUser,
    isLoaded,
    isSignedIn,
    currentUser: userService.getCurrentUser(),
    isAuthenticated: userService.isAuthenticated(),
    userId: userService.getUserId(),
  };
};

// Export singleton instance
export const userService = UserService.getInstance();
