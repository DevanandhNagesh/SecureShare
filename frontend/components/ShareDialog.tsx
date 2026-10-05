"use client";

import { useState } from "react";
import { ShareOut } from "@/types";
import { createShare, revokeShare } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { X, Trash2, Share2, Loader2, Clock } from "lucide-react";

interface ShareDialogProps {
  fileId: number;
  filename: string;
  existingShares: ShareOut[];
  onClose: () => void;
  onShareCreated: (share: ShareOut) => void;
  onShareRevoked: (shareId: number) => void;
}

export default function ShareDialog({
  fileId,
  filename,
  existingShares,
  onClose,
  onShareCreated,
  onShareRevoked,
}: ShareDialogProps) {
  const { token } = useAuth();
  const [recipient, setRecipient] = useState("");
  const [expiryMinutes, setExpiryMinutes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<number | null>(null);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !recipient.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const share = await createShare(token, {
        file_id: fileId,
        recipient_username: recipient.trim(),
        expires_in_minutes: expiryMinutes ? parseInt(expiryMinutes) : undefined,
      });
      onShareCreated(share);
      setRecipient("");
      setExpiryMinutes("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Share failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (shareId: number) => {
    if (!token) return;
    setRevoking(shareId);
    try {
      await revokeShare(token, shareId);
      onShareRevoked(shareId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Revoke failed");
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Share2 className="h-5 w-5 text-indigo-400" />
              Share File
            </h2>
            <p className="mt-0.5 text-sm text-slate-400">
              <span className="font-mono text-slate-300">{filename}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* PRE note */}
        <div className="mb-5 rounded-lg border border-indigo-800 bg-indigo-950/50 p-3 text-sm text-indigo-300">
          🔑 When you share, the server computes a <strong>re-encryption key</strong>{" "}
          <code className="rounded bg-indigo-900 px-1 text-xs">rk(you→recipient)</code>.
          The recipient&apos;s download will use this key to transform the
          ciphertext — your plaintext file key is never exposed.
        </div>

        {/* Share form */}
        <form onSubmit={handleShare} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Recipient Username
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. bob"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Expiry (minutes) — optional
            </label>
            <input
              type="number"
              min="1"
              value={expiryMinutes}
              onChange={(e) => setExpiryMinutes(e.target.value)}
              placeholder="Leave blank = never expires"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          {error && (
            <p className="rounded bg-red-900/40 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !recipient.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating re-encryption key…
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                Share &amp; Generate rk
              </>
            )}
          </button>
        </form>

        {/* Active shares */}
        {existingShares.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Active Shares
            </h3>
            <ul className="space-y-2">
              {existingShares.map((share) => (
                <li
                  key={share.id}
                  className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      → {share.recipient_username}
                    </p>
                    {share.expires_at ? (
                      <p className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        Expires {new Date(share.expires_at).toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">Never expires</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRevoke(share.id)}
                    disabled={revoking === share.id}
                    className="flex items-center gap-1 rounded-md border border-slate-600 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-red-500 hover:text-red-400 disabled:opacity-50"
                  >
                    {revoking === share.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
