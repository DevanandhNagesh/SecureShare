// Types matching the FastAPI Pydantic schemas

export interface UserOut {
  id: number;
  username: string;
  elg_public: string;
}

export interface UserMeOut {
  id: number;
  username: string;
  elg_public: string;
  elg_private: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface FileOut {
  id: number;
  filename: string;
  sha256_hash: string;
  created_at: string; // ISO datetime string
  enc_key_c1?: string;
  enc_key_c2?: string;
}

export interface ShareCreate {
  file_id: number;
  recipient_username: string;
  expires_in_minutes?: number;
}

export interface ShareOut {
  id: number;
  file_id: number;
  recipient_username: string;
  filename?: string;
  rk?: string;
  created_at: string;
  expires_at: string | null;
}

export interface PreTraceOut {
  share_id: number;
  file_id: number;
  filename: string;
  c1: string;
  c2: string;
  rk: string;
  c1_prime: string;
  c2_prime: string;
  recovered_aes_key_int: string;
}

export interface CiphertextOut {
  ciphertext_b64: string;
}

export interface PlaintextOut {
  text: string | null;
  is_text: boolean;
  error?: string | null;
}

export interface AuditLogOut {
  id: number;
  action: string;
  detail: string;
  timestamp: string;
}

export type ActionType =
  | "USER_SIGNUP"
  | "FILE_UPLOADED"
  | "SHARE_CREATED"
  | "PROXY_REENCRYPT"
  | "DOWNLOAD"
  | "SHARE_REVOKED";
