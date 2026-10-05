"use client";

import { AuditLogOut } from "@/types";
import { FileUp, Share2, RefreshCw, Download, Trash2, UserPlus } from "lucide-react";

interface AuditTimelineProps {
  logs: AuditLogOut[];
}

const actionConfig: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  USER_SIGNUP: {
    label: "User Signup",
    color: "text-slate-300",
    bg: "bg-slate-700",
    icon: <UserPlus className="h-3.5 w-3.5" />,
  },
  FILE_UPLOADED: {
    label: "File Uploaded",
    color: "text-blue-300",
    bg: "bg-blue-900",
    icon: <FileUp className="h-3.5 w-3.5" />,
  },
  SHARE_CREATED: {
    label: "Share Created",
    color: "text-green-300",
    bg: "bg-green-900",
    icon: <Share2 className="h-3.5 w-3.5" />,
  },
  PROXY_REENCRYPT: {
    label: "Proxy Re-Encrypt",
    color: "text-purple-300",
    bg: "bg-purple-900",
    icon: <RefreshCw className="h-3.5 w-3.5" />,
  },
  DOWNLOAD: {
    label: "Download",
    color: "text-teal-300",
    bg: "bg-teal-900",
    icon: <Download className="h-3.5 w-3.5" />,
  },
  SHARE_REVOKED: {
    label: "Share Revoked",
    color: "text-red-300",
    bg: "bg-red-900",
    icon: <Trash2 className="h-3.5 w-3.5" />,
  },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

export default function AuditTimeline({ logs }: AuditTimelineProps) {
  if (logs.length === 0) {
    return (
      <p className="py-8 text-center text-slate-500">
        No audit events yet. Perform some actions and check back.
      </p>
    );
  }

  return (
    <ol className="relative ml-4 border-l border-slate-700">
      {logs.map((log, i) => {
        const cfg = actionConfig[log.action] ?? {
          label: log.action,
          color: "text-slate-300",
          bg: "bg-slate-700",
          icon: null,
        };
        return (
          <li key={log.id} className={`mb-6 ml-6 ${i === 0 ? "mt-1" : ""}`}>
            {/* Dot */}
            <span
              className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ${cfg.bg} ring-4 ring-slate-950`}
            >
              <span className={cfg.color}>{cfg.icon}</span>
            </span>

            <div className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-3">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.color}`}
                >
                  {cfg.icon}
                  {cfg.label}
                </span>
                <time className="text-xs text-slate-500">
                  {formatTime(log.timestamp)}
                </time>
              </div>
              <p className="text-sm text-slate-300">{log.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
