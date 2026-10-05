"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signup } from "@/lib/api";
import { Shield, Loader2, UserPlus, CheckCircle2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signup(username.trim(), password);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
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
          <h1 className="text-2xl font-bold text-white">Create an account</h1>
          <p className="mt-1 text-sm text-slate-400">
            A unique ElGamal keypair is generated for you at signup.
          </p>
        </div>

        {success ? (
          <div className="rounded-xl border border-green-700 bg-green-900/30 p-6 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-green-400" />
            <p className="font-semibold text-white">Account created!</p>
            <p className="mt-1 text-sm text-slate-400">
              Redirecting you to login…
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl"
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">
                  Username
                </label>
                <input
                  id="signup-username"
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
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
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
              id="signup-submit"
              type="submit"
              disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account &amp; generating keypair…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Sign Up
                </>
              )}
            </button>

            <p className="mt-4 text-center text-sm text-slate-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-indigo-400 hover:text-indigo-300"
              >
                Log in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
