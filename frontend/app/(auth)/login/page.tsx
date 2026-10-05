"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Shield, Loader2, LogIn } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username.trim(), password);
      // login() redirects to /dashboard on success
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">SecureShare</h1>
          <p className="mt-1 text-sm text-slate-400">
            End-to-End Encrypted File Sharing
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl"
        >
          <h2 className="mb-4 text-lg font-semibold text-white">Sign In</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Username
              </label>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="alice"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded bg-red-900/40 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Authenticating…
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Log In
              </>
            )}
          </button>

          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-xs text-slate-500">
            ℹ️ Your session token is held{" "}
            <strong className="text-slate-400">in memory only</strong>. Refreshing
            the page will require you to log in again.
          </div>

          <p className="mt-4 text-center text-sm text-slate-400">
            No account?{" "}
            <Link
              href="/signup"
              className="font-medium text-indigo-400 hover:text-indigo-300"
            >
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
