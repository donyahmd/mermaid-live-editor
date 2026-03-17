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

interface GoogleCredentialPayload {
  email?: string;
  name?: string;
  picture?: string;
  sub?: string;
}

const AUTH_STORAGE_KEY = 'mermaidLiveAuth';

const initialState: AuthState = {
  isAuthenticated: false,
  isHydrated: false,
  isWhitelisted: false,
  user: null
};

const isAllowedEmail = (email: string): boolean => {
  const normalizedEmail = email.trim().toLowerCase();
  return env.allowedEmails.includes(normalizedEmail);
};

const decodeGoogleCredential = (credential: string): GoogleCredentialPayload | null => {
  try {
    const payloadBase64 = credential.split('.')[1];
    if (!payloadBase64) {
      return null;
    }

    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(normalized);
    return JSON.parse(decoded) as GoogleCredentialPayload;
  } catch {
    return null;
  }
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
    subscribe,
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
    loginWithGoogleCredential(credential: string) {
      const payload = decodeGoogleCredential(credential);
      if (!payload?.email) {
        return {
          success: false,
          whitelisted: false
        };
      }

      const user: AuthUser = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        sub: payload.sub
      };

      const whitelisted = isAllowedEmail(user.email);
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
    }
  };
};

export const authStore = createAuthStore();

export const isProtectedPath = (pathname: string): boolean => {
  return pathname === '/edit' || pathname.startsWith('/edit/') || pathname === '/view' || pathname.startsWith('/view/');
};
