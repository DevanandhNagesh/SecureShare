"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getAuditLog } from "@/lib/api";
import { AuditLogOut } from "@/types";
import AuditTimeline from "@/components/AuditTimeline";
import { ScrollText, Loader2, RefreshCw } from "lucide-react";

export default function AuditLogPage() {
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<AuditLogOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getAuditLog(token);
      setLogs(data);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (!isAuthenticated) return null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <ScrollText className="h-6 w-6 text-indigo-400" />
            Audit Log
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Immutable timeline of all cryptographic and access events for your
            account — newest first
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Event legend */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { label: "File Uploaded", bg: "bg-blue-900", text: "text-blue-300" },
          { label: "Share Created", bg: "bg-green-900", text: "text-green-300" },
          { label: "Proxy Re-Encrypt", bg: "bg-purple-900", text: "text-purple-300" },
          { label: "Download", bg: "bg-teal-900", text: "text-teal-300" },
          { label: "Share Revoked", bg: "bg-red-900", text: "text-red-300" },
          { label: "User Signup", bg: "bg-slate-700", text: "text-slate-300" },
        ].map((item) => (
          <span
            key={item.label}
            className={`rounded px-2.5 py-1 text-xs font-medium ${item.bg} ${item.text}`}
          >
            {item.label}
          </span>
        ))}
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <AuditTimeline logs={logs} />
      )}
    </div>
  );
}
