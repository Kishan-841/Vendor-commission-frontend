import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "./types";
import { api, setToken, setOnUnauthorized } from "./api";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  hydrated: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
  setHydrated: () => void;
}

// Auth state persisted to localStorage. The token is ALSO mirrored into the
// api module's storage key so the fetch wrapper can read it without importing
// the store (avoids a client/server import cycle).
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      hydrated: false,
      setAuth: (token, user) => {
        setToken(token);
        set({ token, user });
      },
      logout: () => {
        // Fire-and-forget so logout is audited server-side (with IP); local
        // state clears immediately either way.
        api.post("/auth/logout").catch(() => {});
        setToken(null);
        set({ token: null, user: null });
      },
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "vcms_auth",
      onRehydrateStorage: () => (state) => {
        // Re-sync the api token key from the rehydrated store and flag ready.
        if (state?.token) setToken(state.token);
        state?.setHydrated();
      },
    },
  ),
);

// The api client saw a 401: the session is expired/invalid. Clear auth state
// directly (NOT via logout() — that would POST /auth/logout with the dead
// token and 401 again). The persisted state updates and the app-shell guard
// redirects to /login.
setOnUnauthorized(() => {
  useAuth.setState({ token: null, user: null });
});
