import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export interface User {
  id: string;
  username: string;
  language: string;
  audioEnabled: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<User>;
  register: (username: string, password: string, language?: string, audioEnabled?: boolean) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (patch: Partial<Pick<User, "language" | "audioEnabled">>) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch("/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Login failed" }));
      throw new Error(err.error || "Login failed");
    }
    const data = await res.json();
    setUser(data);
    return data;
  }, []);

  const register = useCallback(
    async (username: string, password: string, language = "en", audioEnabled = true) => {
      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password, language, audioEnabled }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Registration failed" }));
        throw new Error(err.error || "Registration failed");
      }
      const data = await res.json();
      setUser(data);
      return data;
    },
    [],
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  }, []);

  const updateUser = useCallback(
    async (patch: Partial<Pick<User, "language" | "audioEnabled">>) => {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed to update user");
      const data = await res.json();
      setUser(data);
      return data;
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refresh,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
