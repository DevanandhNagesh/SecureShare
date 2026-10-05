"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getAuthMe } from "@/lib/api";
import { UserMeOut } from "@/types";
import { Key, Eye, EyeOff, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

export default function UserKeyInspector() {
  const { token, username } = useAuth();
  const [userInfo, setUserInfo] = useState<UserMeOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [showFullPublic, setShowFullPublic] = useState(false);
  const [showFullPrivate, setShowFullPrivate] = useState(false);
  const [copiedKey, setCopiedKey] = useState<"pub" | "priv" | null>(null);

  useEffect(() => {
    if (!token) return;
    getAuthMe(token)
      .then((data) => setUserInfo(data))
      .catch((err) => console.error("Failed to load user keys", err))
      .finally(() => setLoading(false));
  }, [token]);

  const copyToClipboard = (text: string, type: "pub" | "priv") => {
    navigator.clipboard.writeText(text);
    setCopiedKey(type);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const truncate = (val: string, showFull: boolean, len = 24) => {
    if (!val) return "";
    if (showFull || val.length <= len * 2) return val;
    return `${val.substring(0, len)}...${val.substring(val.length - len)}`;
  };

  if (loading || !userInfo) {
    return null;
  }

  return (
    <div className="mb-6 rounded-xl border border-indigo-900/60 bg-slate-900/90 shadow-lg overflow-hidden">
      {/* Header bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex cursor-pointer items-center justify-between border-b border-slate-800 bg-slate-950/60 px-5 py-3.5 transition hover:bg-slate-900"
      >
        <div className="flex items-center gap-2.5">
          <Key className="h-4 w-4 text-indigo-400" />
          <h2 className="text-sm font-semibold tracking-wide text-white">
            Crypto Inspector: ElGamal Keypair ({username})
          </h2>
          <span className="rounded bg-indigo-950 border border-indigo-800/80 px-2 py-0.5 text-[11px] font-medium text-indigo-300">
            BBS98 Scheme
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-slate-400 hover:text-slate-200"
            aria-label={isOpen ? "Collapse key inspector" : "Expand key inspector"}
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-5 space-y-4">

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Public Key */}
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider">
                  Public Key (g^a mod p)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowFullPublic(!showFullPublic)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    {showFullPublic ? (
                      <>
                        <EyeOff className="h-3 w-3" /> Truncate
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3" /> Show Full
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => copyToClipboard(userInfo.elg_public, "pub")}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 ml-2"
                  >
                    {copiedKey === "pub" ? (
                      <>
                        <Check className="h-3 w-3 text-green-400" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="font-mono text-xs break-all text-slate-300 bg-slate-900/80 p-2.5 rounded border border-slate-800/80 max-h-28 overflow-y-auto">
                {truncate(userInfo.elg_public, showFullPublic)}
              </div>
            </div>

            {/* Private Key */}
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                  Private Key (a)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowFullPrivate(!showFullPrivate)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    {showFullPrivate ? (
                      <>
                        <EyeOff className="h-3 w-3" /> Truncate
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3" /> Show Full
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => copyToClipboard(userInfo.elg_private, "priv")}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 ml-2"
                  >
                    {copiedKey === "priv" ? (
                      <>
                        <Check className="h-3 w-3 text-green-400" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="font-mono text-xs break-all text-slate-300 bg-slate-900/80 p-2.5 rounded border border-slate-800/80 max-h-28 overflow-y-auto">
                {truncate(userInfo.elg_private, showFullPrivate)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
