"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8010";

interface AuthState {
  token: string | null;
  username: string | null;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ token: null, username: null });
  const router = useRouter();

  const login = useCallback(async (username: string, password: string) => {
    // OAuth2 password flow requires application/x-www-form-urlencoded
    const body = new URLSearchParams();
    body.append("username", username);
    body.append("password", password);

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(err.detail ?? "Login failed");
    }

    const data = await res.json();
    setAuth({ token: data.access_token, username });
    router.push("/dashboard");
  }, [router]);

  const logout = useCallback(() => {
    setAuth({ token: null, username: null });
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        ...auth,
        isAuthenticated: !!auth.token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
