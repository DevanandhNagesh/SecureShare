"use client";

import { useState } from "react";
import { getShareTrace } from "@/lib/api";
import { PreTraceOut } from "@/types";
import { Calculator, Loader2, ChevronDown, ChevronUp, Copy, Check, ArrowRight } from "lucide-react";

interface DecryptionTraceViewerProps {
  shareId: number;
  token: string;
  rk?: string;
}

export default function DecryptionTraceViewer({
  shareId,
  token,
  rk,
}: DecryptionTraceViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [trace, setTrace] = useState<PreTraceOut | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const toggleOpen = async () => {
    if (!isOpen && !trace) {
      setLoading(true);
      try {
        const res = await getShareTrace(token, shareId);
        setTrace(res);
      } catch (err: unknown) {
        console.error("Failed to fetch decryption trace", err);
      } finally {
        setLoading(false);
      }
    }
    setIsOpen(!isOpen);
  };

  const copyVal = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="mt-3">
      <button
        onClick={toggleOpen}
        className="flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors"
      >
        <Calculator className="h-3.5 w-3.5" />
        {isOpen ? "Hide PRE Mathematical Trace" : "Inspect Decryption Trace (BBS98 Math)"}
        {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {isOpen && (
        <div className="mt-3 rounded-xl border border-purple-900/70 bg-slate-950 p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-purple-950/80 pb-2.5">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                BBS98 Proxy Re-Encryption Trace
              </h4>
              <p className="text-[11px] text-slate-400">
                Real cryptographic values computed by the server for Share #{shareId}
              </p>
            </div>
            {rk && (
              <span className="rounded bg-purple-950 px-2 py-0.5 font-mono text-[11px] text-purple-300 border border-purple-800">
                rk = {rk.slice(0, 8)}…{rk.slice(-6)}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            </div>
          ) : trace ? (
            <div className="space-y-3">
              {/* Step 1 */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-900/80 text-[10px] font-bold text-blue-300">
                    1
                  </span>
                  <span className="text-xs font-semibold text-slate-200">
                    Alice&apos;s Stored Ciphertext (under Alice&apos;s Public Key)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-2">
                  Original encryption of AES key <code className="text-slate-300">m</code>:
                  c1 = g^k mod p, c2 = m · (y_A)^k mod p
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="flex items-center justify-between rounded bg-slate-950 p-2 border border-slate-800">
                    <span className="truncate mr-2"><strong className="text-blue-400">c1:</strong> {trace.c1}</span>
                    <button onClick={() => copyVal(trace.c1, "c1")} className="text-slate-400 hover:text-slate-200">
                      {copiedField === "c1" ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded bg-slate-950 p-2 border border-slate-800">
                    <span className="truncate mr-2"><strong className="text-blue-400">c2:</strong> {trace.c2}</span>
                    <button onClick={() => copyVal(trace.c2, "c2")} className="text-slate-400 hover:text-slate-200">
                      {copiedField === "c2" ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="rounded-lg border border-purple-900/40 bg-purple-950/20 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-900/80 text-[10px] font-bold text-purple-300">
                    2
                  </span>
                  <span className="text-xs font-semibold text-purple-200">
                    Proxy Transforms with Re-encryption Key: rk = a / b mod q
                  </span>
                </div>
                <p className="text-[11px] text-purple-300/80 mb-2">
                  Proxy computes: <code className="rounded bg-purple-950 px-1 text-purple-200">c1&apos; = c1^(rk) mod p</code> and <code className="rounded bg-purple-950 px-1 text-purple-200">c2&apos; = c2</code> (Proxy never learns AES key m!)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="flex items-center justify-between rounded bg-slate-950 p-2 border border-purple-900/60">
                    <span className="truncate mr-2"><strong className="text-purple-400">c1&apos;:</strong> {trace.c1_prime}</span>
                    <button onClick={() => copyVal(trace.c1_prime, "c1_prime")} className="text-slate-400 hover:text-slate-200">
                      {copiedField === "c1_prime" ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded bg-slate-950 p-2 border border-purple-900/60">
                    <span className="truncate mr-2"><strong className="text-purple-400">c2&apos;:</strong> {trace.c2_prime}</span>
                    <button onClick={() => copyVal(trace.c2_prime, "c2_prime")} className="text-slate-400 hover:text-slate-200">
                      {copiedField === "c2_prime" ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-900/80 text-[10px] font-bold text-teal-300">
                    3
                  </span>
                  <span className="text-xs font-semibold text-slate-200">
                    Recipient Decrypts with Private Key b &rarr; Recovers AES Key
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-2">
                  Recipient computes: <code className="text-slate-300">m = c2&apos; / (c1&apos;)^b mod p</code>
                </p>
                <div className="flex items-center justify-between rounded bg-slate-950 p-2 text-xs font-mono border border-slate-800">
                  <span className="truncate mr-2">
                    <strong className="text-teal-400">Recovered AES Key (int):</strong> {trace.recovered_aes_key_int}
                  </span>
                  <button onClick={() => copyVal(trace.recovered_aes_key_int, "recovered_key")} className="text-slate-400 hover:text-slate-200">
                    {copiedField === "recovered_key" ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              {/* Step 4 */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-900/80 text-[10px] font-bold text-emerald-300">
                    4
                  </span>
                  <span className="text-xs font-semibold text-slate-200">
                    Symmetric AES-256-GCM Decryption &amp; SHA-256 Verification
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Recovered AES integer is converted to 32 bytes and used with AES-GCM nonce to decrypt the file payload.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-red-400">Failed to load PRE trace.</p>
          )}
        </div>
      )}
    </div>
  );
}
