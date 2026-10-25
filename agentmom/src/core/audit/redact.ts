import { isSecretRef } from "../secrets/secrets.ts";

export const REDACTED = "[REDACTED]";

const SENSITIVE_KEY = /(pass(word|wd)?|secret|token|api[-_]?key|authorization|credential|private[-_]?key|cookie)/i;
const SAFE_KEYS = new Set(["secret_ref", "secretRef"]);

const VALUE_PATTERNS: RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g,
  /\bsk-[A-Za-z0-9_-]{16,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
  /\bBearer\s+[A-Za-z0-9._~+/-]{12,}=*/gi,
];

const ASSIGNMENT = /\b(password|passwd|secret|token|api[_-]?key)\b(\s*[:=]\s*)(\S+)/gi;

// Exact secret values known to this process (session tokens, secrets read from a store) are masked wherever they appear.
const knownSecrets = new Set<string>();

export function registerKnownSecret(value: string): void {
  if (value.length >= 8) knownSecrets.add(value);
}

export function redactString(value: string): string {
  let out = value;
  for (const secret of knownSecrets) if (out.includes(secret)) out = out.split(secret).join(REDACTED);
  for (const pattern of VALUE_PATTERNS) out = out.replace(pattern, REDACTED);
  return out.replace(ASSIGNMENT, (_m, key: string, sep: string) => `${key}${sep}${REDACTED}`);
}

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 10) return "[TRUNCATED]";
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      // Only a structured secret_ref field whose whole value is a valid reference stays readable; free text never gets an exemption.
      if (SAFE_KEYS.has(key) && typeof v === "string" && isSecretRef(v)) out[key] = v;
      else out[key] = SENSITIVE_KEY.test(key) ? REDACTED : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}
