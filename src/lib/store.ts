import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "./types";
import { setToken } from "./api";

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
