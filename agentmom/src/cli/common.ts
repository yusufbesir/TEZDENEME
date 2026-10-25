// AgentMom terminal ortak parçaları (Faz 8/10). Yazan: Claude [İP:AgentMom Faz 10]. Yalnızca tipler ve saf yardımcılar; giriş modülü değildir.
export interface CliIo {
  fetch: (url: string, init: { headers: Record<string, string>; method?: string; body?: string }) => Promise<{ status: number; text: () => Promise<string> }>;
  readToken: () => string;
  out: (line: string) => void;
  err: (line: string) => void;
  openUrl: (url: string) => void;
  baseUrl: string;
}

export const LOOPBACK = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\]):\d{1,5}$/;
export const TOKEN_RE = /^[A-Za-z0-9_-]{16,200}$/;

export const STATE_TR: Record<string, string> = { pending: "bekliyor", awaiting_approval: "onay bekliyor", approved: "onaylandı", running: "çalışıyor", succeeded: "başarılı", failed: "başarısız", cancelled: "iptal", denied: "reddedildi" };
export const DEBT_TR: Record<string, string> = { broken: "KIRIK", overdue: "GECİKMİŞ", pending: "bekliyor" };

// Server-provided text goes to a terminal: strip control characters so it cannot rewrite the screen or fake output.
export function clean(v: unknown): string {
  return String(v ?? "").replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠⁦-⁩﻿]/g, " ").slice(0, 300);
}

export async function getJson(io: CliIo, path: string, token: string | null, method = "GET", body?: unknown): Promise<{ status: number; json: any }> {
  // A hung server must not hang the terminal: every request has a hard time limit.
  const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};
  if (body !== undefined) headers["content-type"] = "application/json";
  const r = await io.fetch(`${io.baseUrl}${path}`, { headers, ...(method !== "GET" ? { method } : {}), ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const text = await r.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: r.status, json };
}

