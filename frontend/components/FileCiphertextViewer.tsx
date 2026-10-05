"use client";

import { useState } from "react";
import { getFileCiphertext, getOwnFilePlaintext } from "@/lib/api";
import { FileOut, PlaintextOut } from "@/types";
import {
  Code,
  Copy,
  Check,
  Eye,
  EyeOff,
  Loader2,
  ShieldAlert,
  Unlock,
  CheckCircle2,
  XCircle,
  KeyRound,
} from "lucide-react";

interface FileCiphertextViewerProps {
  file: FileOut;
  token: string;
}

export default function FileCiphertextViewer({ file, token }: FileCiphertextViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingCiphertext, setLoadingCiphertext] = useState(false);
  const [ciphertextB64, setCiphertextB64] = useState<string | null>(null);
  const [showFullCiphertext, setShowFullCiphertext] = useState(false);
  const [copiedCiphertext, setCopiedCiphertext] = useState(false);
  const [copiedKey, setCopiedKey] = useState<"c1" | "c2" | null>(null);

  // Direct Owner Decryption Test State
  const [showDecryptSection, setShowDecryptSection] = useState(false);
  const [customKey, setCustomKey] = useState("");
  const [decrypting, setDecrypting] = useState(false);
  const [decryptResult, setDecryptResult] = useState<PlaintextOut | null>(null);

  const toggleOpen = async () => {
    if (!isOpen && !ciphertextB64) {
      setLoadingCiphertext(true);
      try {
        const res = await getFileCiphertext(token, file.id);
        setCiphertextB64(res.ciphertext_b64);
      } catch (err: unknown) {
        console.error("Failed to fetch ciphertext", err);
      } finally {
        setLoadingCiphertext(false);
      }
    }
    setIsOpen(!isOpen);
  };

  const copyText = (text: string, type: "cipher" | "c1" | "c2") => {
    navigator.clipboard.writeText(text);
    if (type === "cipher") {
      setCopiedCiphertext(true);
      setTimeout(() => setCopiedCiphertext(false), 2000);
    } else {
      setCopiedKey(type);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleOwnerDecrypt = async () => {
    setDecrypting(true);
    setDecryptResult(null);
    try {
      const res = await getOwnFilePlaintext(token, file.id, customKey || undefined);
      setDecryptResult(res);
    } catch (err: unknown) {
      setDecryptResult({
        text: null,
        is_text: false,
        error: err instanceof Error ? err.message : "Decryption failed",
      });
    } finally {
      setDecrypting(false);
    }
  };

  const byteCount = ciphertextB64
    ? Math.floor((ciphertextB64.length * 3) / 4)
    : null;

  return (
    <div className="mt-3 border-t border-slate-750 pt-3">
      {/* Action toggle button */}
      <div className="flex items-center justify-between">
        <button
          onClick={toggleOpen}
          className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <Code className="h-3.5 w-3.5" />
          {isOpen ? "Hide Encrypted Content" : "View Encrypted Content & Key Math"}
        </button>

        {/* Truncated C1 / C2 teaser */}
        {file.enc_key_c1 && file.enc_key_c2 && (
          <span className="hidden sm:inline-flex text-[11px] font-mono text-slate-400">
            Encrypted AES Key: c1={file.enc_key_c1.slice(0, 8)}… c2={file.enc_key_c2.slice(0, 8)}…
          </span>
        )}
      </div>

      {isOpen && (
        <div className="mt-3 space-y-4 rounded-lg border border-slate-700/80 bg-slate-950 p-4">
          {/* ElGamal Encrypted AES Key (c1, c2) display */}
          {file.enc_key_c1 && file.enc_key_c2 && (
            <div className="rounded-md border border-slate-800 bg-slate-900/90 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  ElGamal Ciphertext of AES Key: (c1, c2)
                </span>
                <span className="text-[11px] text-slate-400">
                  Encrypted under your public key
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center justify-between">
                  <div className="truncate mr-2">
                    <span className="text-indigo-400 font-bold">c1: </span>
                    <span className="text-slate-300">{file.enc_key_c1}</span>
                  </div>
                  <button
                    onClick={() => copyText(file.enc_key_c1!, "c1")}
                    className="shrink-0 text-slate-400 hover:text-slate-200"
                    title="Copy c1"
                  >
                    {copiedKey === "c1" ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center justify-between">
                  <div className="truncate mr-2">
                    <span className="text-indigo-400 font-bold">c2: </span>
                    <span className="text-slate-300">{file.enc_key_c2}</span>
                  </div>
                  <button
                    onClick={() => copyText(file.enc_key_c2!, "c2")}
                    className="shrink-0 text-slate-400 hover:text-slate-200"
                    title="Copy c2"
                  >
                    {copiedKey === "c2" ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Raw AES-256-GCM Ciphertext Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Raw AES-256-GCM Ciphertext
                </span>
                {byteCount !== null && (
                  <span className="rounded bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 text-[11px] font-mono text-emerald-300">
                    {byteCount.toLocaleString()} bytes encrypted
                  </span>
                )}
              </div>
              {ciphertextB64 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowFullCiphertext(!showFullCiphertext)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    {showFullCiphertext ? (
                      <>
                        <EyeOff className="h-3 w-3" /> Show Less
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3" /> Show All
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => copyText(ciphertextB64, "cipher")}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    {copiedCiphertext ? (
                      <>
                        <Check className="h-3 w-3 text-green-400" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy Ciphertext
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {loadingCiphertext ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
              </div>
            ) : ciphertextB64 ? (
              <div className="rounded border border-emerald-950/80 bg-slate-950 p-3 font-mono text-xs text-emerald-400/90 break-all leading-relaxed shadow-inner max-h-48 overflow-y-auto selection:bg-emerald-800 selection:text-white">
                {showFullCiphertext
                  ? ciphertextB64
                  : `${ciphertextB64.substring(0, 200)}${ciphertextB64.length > 200 ? "..." : ""}`}
              </div>
            ) : (
              <p className="text-xs text-red-400">Failed to load ciphertext.</p>
            )}

            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              <span className="font-semibold text-slate-300">Security note:</span> This is the raw AES-256-GCM
              ciphertext stored on the server. Without the AES key (which is encrypted with your ElGamal public
              key), this is computationally indistinguishable from random noise.
            </p>
          </div>

          {/* Test Owner Decryption Toggle */}
          <div className="border-t border-slate-800 pt-3">
            <button
              onClick={() => setShowDecryptSection(!showDecryptSection)}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300"
            >
              <Unlock className="h-3.5 w-3.5" />
              {showDecryptSection ? "Hide Decrypt Panel" : "Direct Owner Decryption"}
            </button>

            {showDecryptSection && (
              <div className="mt-2.5 rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-3">
                <p className="text-xs text-slate-400">
                  Direct ElGamal decryption using your private key.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="Enter private key (or leave blank to use your active key)..."
                    className="flex-1 rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    onClick={handleOwnerDecrypt}
                    disabled={decrypting}
                    className="flex items-center justify-center gap-1.5 rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {decrypting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                    Decrypt
                  </button>
                </div>

                {decryptResult && (
                  <div className="mt-2">
                    {decryptResult.error ? (
                      <div className="flex items-start gap-2 rounded border border-red-800/80 bg-red-950/40 p-3 text-xs text-red-300">
                        <XCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                        <div>
                          <p className="font-semibold text-red-200">Decryption Failed</p>
                          <p className="mt-0.5 text-red-300/90">{decryptResult.error}</p>
                        </div>
                      </div>
                    ) : decryptResult.is_text && decryptResult.text !== null ? (
                      <div className="rounded border border-green-800/80 bg-green-950/30 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-green-400 mb-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Decryption successful (SHA-256 verified)
                        </div>
                        <pre className="rounded bg-slate-950 p-2.5 font-mono text-xs text-slate-200 whitespace-pre-wrap max-h-40 overflow-y-auto border border-slate-800">
                          {decryptResult.text}
                        </pre>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded border border-indigo-800/80 bg-indigo-950/40 p-3 text-xs text-indigo-300">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        Decryption successful -- binary file, cannot display as plain text. Use regular Download to view.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
