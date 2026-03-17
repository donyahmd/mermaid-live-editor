import { env } from '$/util/env';
import { writable } from 'svelte/store';

export interface AuthUser {
  email: string;
  name?: string;
  picture?: string;
  sub?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isHydrated: boolean;
  isWhitelisted: boolean;
  user: AuthUser | null;
}

const AUTH_STORAGE_KEY = 'mermaidLiveAuth';

const isAllowedEmail = (email: string): boolean => {
  const normalizedEmail = email.trim().toLowerCase();
  return env.allowedEmails.includes(normalizedEmail);
};

const initialState: AuthState = {
  isAuthenticated: false,
  isHydrated: false,
  isWhitelisted: false,
  user: null
};

const getStoredUser = (): AuthUser | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as AuthUser;
  } catch {
    return null;
  }
};

const persistUser = (user: AuthUser | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!user) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
};

const createAuthStore = () => {
  const { set, subscribe, update } = writable<AuthState>(initialState);

  return {
    hydrate() {
      const user = getStoredUser();
      const isWhitelisted = user ? isAllowedEmail(user.email) : false;

      set({
        isAuthenticated: Boolean(user),
        isHydrated: true,
        isWhitelisted,
        user
      });
    },
    async loginWithGoogleCredential(credential: string) {
      try {
        // Verify token with server-side Netlify Function
        const response = await fetch('/.netlify/functions/verify-google-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ credential })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Token verification failed:', errorData);
          return {
            success: false,
            whitelisted: false
          };
        }

        const data = await response.json();

        if (!data.success || !data.user) {
          return {
            success: false,
            whitelisted: false
          };
        }

        const user: AuthUser = {
          email: data.user.email,
          name: data.user.name,
          picture: data.user.picture,
          sub: data.user.sub
        };

        const whitelisted = data.whitelisted;
        persistUser(user);

        set({
          isAuthenticated: true,
          isHydrated: true,
          isWhitelisted: whitelisted,
          user
        });

        return {
          success: true,
          whitelisted
        };
      } catch (error) {
        console.error('Login error:', error);
        return {
          success: false,
          whitelisted: false
        };
      }
    },
    logout() {
      persistUser(null);
      set({
        ...initialState,
        isHydrated: true
      });
    },
    refreshWhitelist() {
      update((state: AuthState) => {
        if (!state.user) {
          return {
            ...state,
            isWhitelisted: false
          };
        }

        return {
          ...state,
          isWhitelisted: isAllowedEmail(state.user.email)
        };
      });
    },
    subscribe
  };
};

export const authStore = createAuthStore();

export const isProtectedPath = (pathname: string): boolean => {
  return pathname === '/edit' || pathname.startsWith('/edit/') || pathname === '/view' || pathname.startsWith('/view/');
};
