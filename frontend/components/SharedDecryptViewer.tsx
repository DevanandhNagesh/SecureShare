"use client";

import { useState } from "react";
import { getSharedFilePlaintext } from "@/lib/api";
import { PlaintextOut } from "@/types";
import {
  KeyRound,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Eye,
  EyeOff,
  Copy,
  Check,
  FileCheck,
} from "lucide-react";

interface SharedDecryptViewerProps {
  shareId: number;
  token: string;
  defaultPrivateKey: string;
}

export default function SharedDecryptViewer({
  shareId,
  token,
  defaultPrivateKey,
}: SharedDecryptViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [privateKey, setPrivateKey] = useState(defaultPrivateKey);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlaintextOut | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // If defaultPrivateKey changes and user hasn't typed a custom one
  const handleResetKey = () => {
    setPrivateKey(defaultPrivateKey);
    setResult(null);
  };

  const handleDecrypt = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await getSharedFilePlaintext(token, shareId, privateKey.trim());
      setResult(res);
    } catch (err: unknown) {
      setResult({
        text: null,
        is_text: false,
        error:
          err instanceof Error
            ? err.message
            : "Decryption failed: Integrity check failed / AES authentication tag mismatch.",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyPlaintext = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const isKeyModified = privateKey.trim() !== defaultPrivateKey.trim();

  return (
    <div className="mt-3 border-t border-slate-800 pt-3">
      <button
        onClick={() => {
          if (!isOpen && !privateKey && defaultPrivateKey) {
            setPrivateKey(defaultPrivateKey);
          }
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-1.5 text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors"
      >
        <KeyRound className="h-3.5 w-3.5" />
        {isOpen ? "Close Decrypt & View Panel" : "Decrypt & View Plaintext"}
      </button>

      {isOpen && (
        <div className="mt-3 rounded-xl border border-teal-900/60 bg-slate-950 p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-teal-300">
                Recipient Private Key (b)
              </label>
              <div className="flex items-center gap-2">
                {isKeyModified && (
                  <button
                    onClick={handleResetKey}
                    className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-medium"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset to Real Key
                  </button>
                )}
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
                >
                  {showKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showKey ? "Mask" : "Reveal"}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-2">
              Pre-filled with your active private key.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type={showKey ? "text" : "password"}
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="Enter private key decimal integer..."
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <button
                onClick={handleDecrypt}
                disabled={loading || !privateKey.trim()}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50 transition-colors shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Decrypting…
                  </>
                ) : (
                  <>
                    <FileCheck className="h-3.5 w-3.5" />
                    Decrypt
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results section */}
          {result && (
            <div className="pt-2">
              {result.error ? (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-800/80 bg-red-950/40 p-3.5 text-xs text-red-300 shadow-sm">
                  <XCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-red-200">Decryption Failed</p>
                    <p className="leading-relaxed text-red-300/90">{result.error}</p>
                    {isKeyModified && (
                      <p className="mt-1 text-[11px] text-amber-300/90 font-mono">
                        &rarr; The AES-GCM authentication tag rejected this private key.
                      </p>
                    )}
                  </div>
                </div>
              ) : result.is_text && result.text !== null ? (
                <div className="rounded-lg border border-emerald-800/80 bg-slate-900/90 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Decryption successful</span>
                      <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-800">
                        SHA-256 Verified
                      </span>
                    </div>
                    <button
                      onClick={() => copyPlaintext(result.text!)}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
                    >
                      {copiedText ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copy Text
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="rounded bg-slate-950 p-3 font-mono text-xs text-slate-200 whitespace-pre-wrap max-h-56 overflow-y-auto border border-slate-800 selection:bg-teal-900 selection:text-white">
                    {result.text}
                  </pre>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-teal-800/80 bg-teal-950/30 p-3.5 text-xs text-teal-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <p>
                    Decryption successful &mdash; binary file, cannot display as text. Use regular Download to view.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
