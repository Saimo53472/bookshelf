import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "../api";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  loading: boolean; // true until the first /me check finishes
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On startup: is there a valid session cookie?
  useEffect(() => {
    api<User>("/me")
      .then(setUser)
      .catch((err) => {
        // 401 just means "not logged in"
        if (!(err instanceof ApiError && err.status === 401)) console.error(err);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const loggedIn = await api<User>("/auth/login", {
      method: "POST",
      json: { email, password },
    });
    setUser(loggedIn);
  }, []);

  const register = useCallback(
    async (email: string, username: string, password: string) => {
      await api("/auth/register", { method: "POST", json: { email, username, password } });
      await login(email, password); // the API doesn't log you in on register, so do it here
    },
    [login]
  );

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      setUser(null); // even if the request failed, treat the user as logged out locally
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}