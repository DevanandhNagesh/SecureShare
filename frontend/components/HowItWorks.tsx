"use client";

import { Shield, Key, RefreshCw, Unlock, ServerOff, UserCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function HowItWorks() {
  const { username } = useAuth();

  const steps = [
    {
      icon: <Shield className="h-5 w-5 text-blue-400" />,
      title: "1. Upload (You as Alice)",
      text: `When you (${username || "Alice"}) upload a file, it is encrypted with AES-256-GCM. The AES key is then encrypted under your ElGamal public key (g^a mod p) and stored. The server never holds your file or key in plaintext.`,
    },
    {
      icon: <Key className="h-5 w-5 text-green-400" />,
      title: "2. Share & Re-key (Alice → Bob)",
      text: `When you share with another user (Bob), the server computes the re-encryption key rk = a · b⁻¹ mod q. This allows the proxy to transform ciphertexts without learning either participant's private key.`,
    },
    {
      icon: <RefreshCw className="h-5 w-5 text-purple-400" />,
      title: "3. Proxy Transform (The BBS98 Moment)",
      text: "When Bob clicks Download, the server (acting as a semi-trusted proxy) computes c1' = c1^rk mod p and c2' = c2. This transforms the ciphertext from Alice's public key directly to Bob's public key without intermediate decryption.",
    },
    {
      icon: <Unlock className="h-5 w-5 text-teal-400" />,
      title: "4. Recipient Decrypts (You as Bob)",
      text: "When you receive a shared file, your private key b decrypts the transformed ciphertext (c1', c2') to recover the exact AES key, and then decrypts the file payload.",
    },
    {
      icon: <ServerOff className="h-5 w-5 text-amber-400" />,
      title: "Demo Architecture Note",
      text: "In this demo, private keys are queryable via /auth/me for live math inspection. In production, private keys reside exclusively in the client's WebCrypto/secure storage.",
    },
  ];

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-lg">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-white">
          <Shield className="h-4 w-4 text-indigo-400" />
          How Proxy Re-Encryption Works
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          BBS98 / ElGamal scheme &middot; Live interactive demo
        </p>
      </div>

      {username && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-indigo-900/60 bg-indigo-950/40 px-3 py-2 text-xs text-indigo-300">
          <UserCheck className="h-4 w-4 text-indigo-400 shrink-0" />
          <span>
            Active Identity: <strong className="text-white font-mono">{username}</strong> (Owner / Sender in My Files)
          </span>
        </div>
      )}

      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <div className="mt-0.5 shrink-0">{step.icon}</div>
            <div>
              <p className="text-sm font-semibold text-slate-200">
                {step.title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                {step.text}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
