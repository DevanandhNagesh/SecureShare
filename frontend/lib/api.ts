import {
  FileOut,
  ShareCreate,
  ShareOut,
  AuditLogOut,
  UserOut,
  UserMeOut,
  CiphertextOut,
  PlaintextOut,
  PreTraceOut,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8010";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  token: string | null,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

async function apiFetchBlob(
  path: string,
  token: string | null
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `Download failed: ${res.status}`);
  }
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename=([^;]+)/);
  const filename = match ? match[1].replace(/"/g, "") : "download";
  const blob = await res.blob();
  return { blob, filename };
}

/** Triggers a browser file download from a Blob */
export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signup(
  username: string,
  password: string
): Promise<UserOut> {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Signup failed" }));
    throw new Error(err.detail ?? "Signup failed");
  }
  return res.json();
}

// ─── Files ────────────────────────────────────────────────────────────────────

export async function getMyFiles(token: string): Promise<FileOut[]> {
  return apiFetch<FileOut[]>("/files/mine", token);
}

export async function uploadFile(
  token: string,
  file: File
): Promise<FileOut> {
  const form = new FormData();
  form.append("upload", file);
  return apiFetch<FileOut>("/files/upload", token, {
    method: "POST",
    body: form,
  });
}

export async function downloadMyFile(
  token: string,
  fileId: number
): Promise<{ blob: Blob; filename: string }> {
  return apiFetchBlob(`/files/${fileId}/download`, token);
}

// ─── Sharing ──────────────────────────────────────────────────────────────────

export async function createShare(
  token: string,
  payload: ShareCreate
): Promise<ShareOut> {
  return apiFetch<ShareOut>("/sharing/share", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function revokeShare(
  token: string,
  shareId: number
): Promise<void> {
  await apiFetch<{ detail: string }>(`/sharing/share/${shareId}`, token, {
    method: "DELETE",
  });
}

export async function getSharedWithMe(token: string): Promise<ShareOut[]> {
  return apiFetch<ShareOut[]>("/sharing/shared-with-me", token);
}

/**
 * THE PROXY MOMENT:
 * The backend transforms Alice's ciphertext using rk(Alice→Bob) so that
 * Bob can decrypt it with his own private key. The plaintext AES key is
 * never exposed to the proxy/server.
 */
export async function downloadSharedFile(
  token: string,
  shareId: number
): Promise<{ blob: Blob; filename: string }> {
  return apiFetchBlob(`/sharing/download/${shareId}`, token);
}

export async function getAuditLog(token: string): Promise<AuditLogOut[]> {
  return apiFetch<AuditLogOut[]>("/sharing/audit-log", token);
}

// ─── Crypto Inspector & Transparency ──────────────────────────────────────────

export async function getAuthMe(token: string): Promise<UserMeOut> {
  return apiFetch<UserMeOut>("/auth/me", token);
}

export async function getFileCiphertext(
  token: string,
  fileId: number
): Promise<CiphertextOut> {
  return apiFetch<CiphertextOut>(`/files/${fileId}/ciphertext`, token);
}

export async function getOwnFilePlaintext(
  token: string,
  fileId: number,
  privateKey?: string
): Promise<PlaintextOut> {
  const query = privateKey ? `?private_key=${encodeURIComponent(privateKey)}` : "";
  return apiFetch<PlaintextOut>(`/files/${fileId}/plaintext${query}`, token);
}

export async function getSharedFilePlaintext(
  token: string,
  shareId: number,
  privateKey?: string
): Promise<PlaintextOut> {
  const query = privateKey ? `?private_key=${encodeURIComponent(privateKey)}` : "";
  return apiFetch<PlaintextOut>(
    `/sharing/download/${shareId}/plaintext${query}`,
    token
  );
}

export async function downloadSharedFileRaw(
  token: string,
  shareId: number
): Promise<{ blob: Blob; filename: string }> {
  return apiFetchBlob(`/sharing/download/${shareId}/raw`, token);
}

export async function getShareTrace(
  token: string,
  shareId: number
): Promise<PreTraceOut> {
  return apiFetch<PreTraceOut>(`/sharing/download/${shareId}/trace`, token);
}

