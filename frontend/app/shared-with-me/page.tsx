"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getSharedWithMe,
  downloadSharedFile,
  downloadSharedFileRaw,
  getAuthMe,
  triggerDownload,
} from "@/lib/api";
import { ShareOut } from "@/types";
import DecryptionTraceViewer from "@/components/DecryptionTraceViewer";
import SharedDecryptViewer from "@/components/SharedDecryptViewer";
import {
  RefreshCw,
  Download,
  FileCode,
  Loader2,
  FileText,
  Calendar,
  Clock,
  AlertCircle,
} from "lucide-react";

export default function SharedWithMePage() {
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();

  const [shares, setShares] = useState<ShareOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadingRawId, setDownloadingRawId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [userPrivateKey, setUserPrivateKey] = useState<string>("");

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  const fetchShares = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getSharedWithMe(token);
      setShares(data);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  useEffect(() => {
    if (!token) return;
    getAuthMe(token)
      .then((me) => setUserPrivateKey(me.elg_private))
      .catch((err) => console.error("Failed to fetch user me", err));
  }, [token]);

  const handleProxyDownload = async (shareId: number) => {
    if (!token) return;
    setDownloadingId(shareId);
    setDownloadError(null);
    try {
      const { blob, filename } = await downloadSharedFile(token, shareId);
      triggerDownload(blob, filename);
    } catch (err: unknown) {
      setDownloadError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRawDownload = async (shareId: number) => {
    if (!token) return;
    setDownloadingRawId(shareId);
    setDownloadError(null);
    try {
      const { blob, filename } = await downloadSharedFileRaw(token, shareId);
      triggerDownload(blob, filename);
    } catch (err: unknown) {
      setDownloadError(
        err instanceof Error ? err.message : "Raw ciphertext download failed"
      );
    } finally {
      setDownloadingRawId(null);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Shared With Me</h1>
          <p className="mt-1 text-sm text-slate-400">
            Files that others have granted you access to via Proxy Re-Encryption
          </p>
        </div>
        <button
          onClick={fetchShares}
          className="flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {downloadError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {downloadError}
        </div>
      )}

      {/* Shares list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : shares.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900 py-16 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-slate-600" />
          <p className="text-slate-400">
            No files have been shared with you yet.
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Ask another user to share a file from their Dashboard.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {shares.map((share) => (
            <li
              key={share.id}
              className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-lg"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-indigo-400" />
                    <p className="font-semibold text-white truncate">
                      {share.filename || `File #${share.file_id}`}
                    </p>
                    <span className="shrink-0 rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-400">
                      Share #{share.id}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Shared {new Date(share.created_at).toLocaleString()}
                    </span>
                    {share.expires_at ? (
                      <span className="flex items-center gap-1 text-amber-500">
                        <Clock className="h-3 w-3" />
                        Expires {new Date(share.expires_at).toLocaleString()}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-green-600">
                        <Clock className="h-3 w-3" />
                        Never expires
                      </span>
                    )}
                  </div>

                  {/* Step-by-step what happens on download */}
                  <div className="mt-3 rounded-lg border border-slate-700/80 bg-slate-800/60 px-3 py-2 text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">
                      On download:
                    </span>{" "}
                    proxy applies rk → transforms ciphertext → you decrypt with
                    your private key → AES key recovered → file decrypted.
                  </div>
                </div>

                {/* Download Actions */}
                <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
                  {/* The Primary Proxy Download Button */}
                  <button
                    id={`proxy-download-${share.id}`}
                    onClick={() => handleProxyDownload(share.id)}
                    disabled={downloadingId === share.id}
                    className="flex items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-50 shadow-md"
                  >
                    {downloadingId === share.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Re-encrypting…
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Download Decrypted File (PRE)
                      </>
                    )}
                  </button>

                  {/* Download Raw Encrypted Ciphertext */}
                  <button
                    id={`raw-download-${share.id}`}
                    onClick={() => handleRawDownload(share.id)}
                    disabled={downloadingRawId === share.id}
                    title="Download the file exactly as stored on the server (.enc) without proxy re-encryption or decryption"
                    className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/90 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
                  >
                    {downloadingRawId === share.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Downloading Ciphertext…
                      </>
                    ) : (
                      <>
                        <FileCode className="h-4 w-4 text-emerald-400" />
                        Download Encrypted File (.enc)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Step-by-Step PRE Mathematical Trace Inspector */}
              {token && (
                <DecryptionTraceViewer
                  shareId={share.id}
                  token={token}
                  rk={share.rk}
                />
              )}

              {/* Interactive Decrypt & View Plaintext Panel */}
              {token && (
                <SharedDecryptViewer
                  shareId={share.id}
                  token={token}
                  defaultPrivateKey={userPrivateKey}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
