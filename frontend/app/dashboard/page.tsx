"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getMyFiles,
  uploadFile,
  downloadMyFile,
  triggerDownload,
} from "@/lib/api";
import { FileOut, ShareOut } from "@/types";
import ShareDialog from "@/components/ShareDialog";
import UserKeyInspector from "@/components/UserKeyInspector";
import FileCiphertextViewer from "@/components/FileCiphertextViewer";
import {
  Upload,
  Download,
  Share2,
  FileText,
  Loader2,
  RefreshCw,
  Hash,
  Calendar,
} from "lucide-react";

export default function DashboardPage() {
  const { token, isAuthenticated, username } = useAuth();
  const router = useRouter();

  const [files, setFiles] = useState<FileOut[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [shareTarget, setShareTarget] = useState<FileOut | null>(null);
  // Map of fileId -> list of shares for that file (populated when dialog opens)
  const [sharesMap, setSharesMap] = useState<Record<number, ShareOut[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  const fetchFiles = useCallback(async () => {
    if (!token) return;
    setLoadingFiles(true);
    try {
      const data = await getMyFiles(token);
      setFiles(data);
    } catch {
      // silently handle
    } finally {
      setLoadingFiles(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (file: File) => {
    if (!token) return;
    setUploading(true);
    setUploadError(null);
    try {
      const newFile = await uploadFile(token, file);
      setFiles((prev) => [newFile, ...prev]);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    // reset so same file can be re-uploaded
    e.target.value = "";
  };

  const handleDownload = async (fileId: number) => {
    if (!token) return;
    setDownloadingId(fileId);
    try {
      const { blob, filename } = await downloadMyFile(token, fileId);
      triggerDownload(blob, filename);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const openShareDialog = (file: FileOut) => {
    setShareTarget(file);
    if (!sharesMap[file.id]) {
      setSharesMap((prev) => ({ ...prev, [file.id]: [] }));
    }
  };

  const handleShareCreated = (share: ShareOut) => {
    setSharesMap((prev) => ({
      ...prev,
      [share.file_id]: [...(prev[share.file_id] ?? []), share],
    }));
  };

  const handleShareRevoked = (shareId: number, fileId: number) => {
    setSharesMap((prev) => ({
      ...prev,
      [fileId]: (prev[fileId] ?? []).filter((s) => s.id !== shareId),
    }));
  };

  if (!isAuthenticated) return null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, <span className="text-indigo-400">{username}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Your encrypted files — decryptable only by you or authorised recipients
          </p>
        </div>
        <button
          onClick={fetchFiles}
          className="flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Crypto Inspector: Current User Keypair */}
      <UserKeyInspector />

      <div className="space-y-6">
        {/* Upload zone */}
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Upload File
          </h2>
          <div
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-600 bg-slate-800/50 px-6 py-8 text-slate-400 transition hover:border-indigo-500 hover:text-indigo-300"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                <p className="text-sm">Encrypting &amp; uploading…</p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8" />
                <p className="text-sm font-medium">Click to choose a file</p>
                <p className="text-xs">
                  File is AES-256-GCM encrypted; key is ElGamal-encrypted under your public key
                </p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            id="file-upload-input"
            type="file"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {uploadError && (
            <p className="mt-2 rounded bg-red-900/40 px-3 py-2 text-sm text-red-400">
              {uploadError}
            </p>
          )}
        </div>

        {/* File list */}
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
            My Files ({files.length})
          </h2>

          {loadingFiles ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : files.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No files yet. Upload one above.
            </p>
          ) : (
            <ul className="space-y-3">
              {files.map((file) => (
                <li
                  key={file.id}
                  className="rounded-lg border border-slate-700 bg-slate-800 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-indigo-400" />
                        <p className="truncate font-medium text-white">
                          {file.filename}
                        </p>
                        <span className="shrink-0 rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-400">
                          #{file.id}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(file.created_at).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Hash className="h-3 w-3" />
                          {file.sha256_hash.substring(0, 16)}…
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        id={`download-file-${file.id}`}
                        onClick={() => handleDownload(file.id)}
                        disabled={downloadingId === file.id}
                        className="flex items-center gap-1.5 rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300 transition hover:border-teal-500 hover:text-teal-400 disabled:opacity-50"
                      >
                        {downloadingId === file.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        Download
                      </button>
                      <button
                        id={`share-file-${file.id}`}
                        onClick={() => openShareDialog(file)}
                        className="flex items-center gap-1.5 rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300 transition hover:border-indigo-500 hover:text-indigo-400"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        Share
                      </button>
                    </div>
                  </div>

                  {/* Crypto Inspector: Ciphertext & Plaintext inspection */}
                  {token && <FileCiphertextViewer file={file} token={token} />}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Share dialog */}
      {shareTarget && (
        <ShareDialog
          fileId={shareTarget.id}
          filename={shareTarget.filename}
          existingShares={sharesMap[shareTarget.id] ?? []}
          onClose={() => setShareTarget(null)}
          onShareCreated={handleShareCreated}
          onShareRevoked={(shareId) =>
            handleShareRevoked(shareId, shareTarget.id)
          }
        />
      )}
    </div>
  );
}
