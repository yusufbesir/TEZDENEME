// İnternet erişimi katmanı: kamuya açık HTTP(S) GET getirme (D8c-2a). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// SERT sınırlar (ADR-015/016): varsayılan KAPALI; yalnız kullanıcının açtığı ayar + izinli alan adı listesi + (varsayılan) her kullanımda kullanıcı onayı;
// ajan ASLA getiremez; yalnız GET; çerez/yetkilendirme/API anahtarı yok; özel/yerel/ayrılmış her IP reddedilir (TÜM DNS yanıtları denetlenir) ve bağlantı
// DOĞRULANMIŞ IP'ye sabitlenir (DNS rebinding'e karşı ikinci çözümleme yok); yönlendirmeler elle ve her sıçramada baştan doğrulanır; boyut/süre/içerik türü
// sınırlıdır; dönen içerik GÜVENİLMEZ VERİDİR. Her deneme (başarısız olanlar dahil) net_fetches + denetim kaydına yazılır; URL yolu/sorgusu ve içerik YAZILMAZ.
// Hata metinleri sabittir (iç ayrıntı/IP sızdırmaz).
import { createHash, randomUUID } from "node:crypto";
import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import type { IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import type { LookupFunction } from "node:net";
import { isIP } from "node:net";
import type { AuditLog } from "../core/audit/audit.ts";
import { redactString } from "../core/audit/redact.ts";
import type { Db } from "../core/db/db.ts";
import type { Actor } from "../core/policy/types.ts";
import { sharedTickets } from "./approval.ts";
import type { ApprovalTickets } from "./approval.ts";
import { hostAllowed, isBlockedAddress, parseTarget } from "./guard.ts";
import { MAX_TEXT_BYTES, clipBytes, htmlToText, plainToText } from "./html-text.ts";
import { HOW_TO_ENABLE } from "./settings.ts";
import type { NetSettings } from "./settings.ts";

export const MAX_BODY_BYTES = 1024 * 1024;
export const TOTAL_TIMEOUT_MS = 15_000;
export const CONNECT_TIMEOUT_MS = 5_000;
export const MAX_REDIRECTS = 3;
export const MAX_HEADER_BYTES = 16 * 1024;
export const MAX_HEADER_COUNT = 100;
export const MAX_CONCURRENT = 2;
export const MAX_PER_MINUTE = 20;
export const USER_AGENT = "AgentMom/1.0 (+kullanici-istegiyle)";
export const ALLOWED_CONTENT_TYPES: readonly string[] = ["text/html", "text/plain", "text/markdown", "application/json", "application/xml", "application/atom+xml", "application/rss+xml"];
const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const MAX_ADDRESSES = 16;

export interface FetchApproval {
  urls: string[];
  grantedBy: "user";
}

export type Resolver = (hostname: string) => Promise<Array<{ address: string; family: number }>>;

// YALNIZ test için: doğrulanmış hedefi gerçek yuva adresine eşler (yerel sahte sunucu). Üretimde bağlanamaz: NODE_TEST_CONTEXT (node --test) yoksa reddedilir.
export interface TransportOverride {
  remap(t: { hostname: string; address: string; family: number; port: number; protocol: "http:" | "https:" }): { address: string; port: number; tls: boolean };
}

export interface FetchOptions {
  url: string;
  settings: NetSettings;
  approvedBy: Actor;
  purpose: string;
  // Sunucunun verdiği tek kullanımlık onay bileti (POST /api/net/approve). perUseApproval açıkken bilet ŞART; fetchPublic bileti BU URL için burada tüketir.
  ticket?: string;
  tickets?: ApprovalTickets;
  // Bileti zaten redeemApproval ile tüketmiş iç çağıranlar için; bilet doğrulamasından SONRA kurulmuş olmalıdır. Uç bunu kullanmaz.
  approval?: FetchApproval;
  db: Db;
  audit: AuditLog;
  resolver?: Resolver;
  transportOverride?: TransportOverride;
  limiter?: FetchLimiter;
  // Yalnız KISALTMA yapabilir (üst sınırlar sabittir).
  limits?: { totalMs?: number; connectMs?: number };
  now?: () => Date;
}

export interface FetchOk {
  ok: true;
  url: string;
  finalUrl: string;
  fetchedAt: string;
  status: number;
  contentType: string;
  bytes: number;
  sha256: string;
  text: string;
  truncated: boolean;
  untrusted: true;
}

export interface FetchFailed {
  ok: false;
  code: string;
  message: string;
  status?: number;
  // redirect_needs_approval: yönlendirmenin hedefi (kullanıcı bu URL için yeni bilet isteyip yeniden dener).
  redirectTo?: string;
}

export type FetchResult = FetchOk | FetchFailed;

// ---------- hız sınırı ----------

export class FetchLimiter {
  private active = 0;
  private stamps: number[] = [];
  private readonly maxConcurrent: number;
  private readonly perMinute: number;
  private readonly clock: () => number;

  constructor(opts: { maxConcurrent?: number; perMinute?: number; clock?: () => number } = {}) {
    this.maxConcurrent = opts.maxConcurrent ?? MAX_CONCURRENT;
    this.perMinute = opts.perMinute ?? MAX_PER_MINUTE;
    this.clock = opts.clock ?? (() => Date.now());
  }

  // Yer varsa bırakma işlevi döner; yoksa null.
  acquire(): (() => void) | null {
    const t = this.clock();
    this.stamps = this.stamps.filter((s) => t - s < 60_000);
    if (this.active >= this.maxConcurrent || this.stamps.length >= this.perMinute) return null;
    this.active++;
    this.stamps.push(t);
    let released = false;
    return () => {
      if (!released) {
        released = true;
        this.active--;
      }
    };
  }
}

const sharedLimiter = new FetchLimiter();

// ---------- yardımcılar ----------

class FetchFail extends Error {
  readonly code: string;
  readonly status: number | undefined;
  redirectTo: string | undefined;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = "FetchFail";
    this.code = code;
    this.status = status;
  }
}

function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function defaultResolver(hostname: string): ReturnType<Resolver> {
  return dnsLookup(hostname, { all: true, verbatim: true }).then((rows) => rows.map((r) => ({ address: r.address, family: r.family })));
}

function withTimeout<T>(p: Promise<T>, ms: number, fail: () => FetchFail): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(fail()), Math.max(1, ms));
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

// Bağlantı yalnız doğrulanmış adrese yapılır: Node'un kendi DNS çözümlemesi bypass edilir (ikinci çözümleme yok).
function pinnedLookup(address: string): LookupFunction {
  const family = isIP(address);
  return ((_host: string, options: unknown, callback?: unknown) => {
    const cb = (typeof options === "function" ? options : callback) as (err: Error | null, a: unknown, f?: number) => void;
    const all = typeof options === "object" && options !== null && (options as { all?: boolean }).all === true;
    if (all) cb(null, [{ address, family }]);
    else cb(null, address, family);
  }) as unknown as LookupFunction;
}

function mediaType(v: string | undefined): string {
  return (v ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
}

function mapNetError(e: unknown): FetchFail {
  const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : "";
  if (e instanceof FetchFail) return e;
  if (code.startsWith("HPE_") || code === "ERR_HTTP_INVALID_HEADER_VALUE") return new FetchFail("bad_response", "sunucu yanıtı geçersiz ya da çok büyük başlık içeriyor");
  if (code.startsWith("ERR_TLS") || code.startsWith("CERT_") || code.startsWith("UNABLE_TO_") || code === "DEPTH_ZERO_SELF_SIGNED_CERT" || code === "SELF_SIGNED_CERT_IN_CHAIN" || code === "ERR_SSL_WRONG_VERSION_NUMBER") return new FetchFail("tls_failed", "güvenli bağlantı doğrulanamadı");
  return new FetchFail("connect_failed", "bağlantı kurulamadı");
}

interface RawResponse {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
  truncated: boolean;
}

type Verdict = "read" | "skip" | FetchFail;

function requestOnce(u: URL, address: string, override: TransportOverride | undefined, deadline: number, connectMs: number, onResponse: (status: number, headers: Record<string, string>) => Verdict): Promise<RawResponse> {
  return new Promise<RawResponse>((resolve, reject) => {
    const protocol = u.protocol === "https:" ? "https:" : "http:";
    const defaultPort = protocol === "https:" ? 443 : 80;
    const family = isIP(address);
    const target = override ? override.remap({ hostname: u.hostname, address, family, port: defaultPort, protocol }) : { address, port: defaultPort, tls: protocol === "https:" };
    let settled = false;
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    const settle = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      for (const t of timers) clearTimeout(t);
      fn();
    };
    const headers: Record<string, string> = {
      host: u.host,
      "user-agent": USER_AGENT,
      accept: "text/html,text/plain,text/markdown,application/json,application/xml,application/atom+xml,application/rss+xml;q=0.9",
      "accept-encoding": "identity",
      connection: "close",
    };
    const common = { host: u.hostname, port: target.port, method: "GET", path: `${u.pathname}${u.search}`, headers, agent: false as const, lookup: pinnedLookup(target.address), maxHeaderSize: MAX_HEADER_BYTES };
    const onRes = (res: IncomingMessage): void => {
      const status = res.statusCode ?? 0;
      if (res.rawHeaders.length / 2 > MAX_HEADER_COUNT) {
        res.destroy();
        settle(() => reject(new FetchFail("bad_response", "sunucu yanıtı geçersiz ya da çok büyük başlık içeriyor")));
        return;
      }
      const h: Record<string, string> = {};
      for (const [k, v] of Object.entries(res.headers)) if (v !== undefined) h[k] = Array.isArray(v) ? v.join(", ") : v;
      const verdict = onResponse(status, h);
      if (verdict === "skip") {
        res.destroy();
        settle(() => resolve({ status, headers: h, body: Buffer.alloc(0), truncated: false }));
        return;
      }
      if (verdict !== "read") {
        res.destroy();
        settle(() => reject(verdict));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (c: Buffer) => {
        if (settled) return;
        const room = MAX_BODY_BYTES - size;
        if (c.length > room) {
          chunks.push(c.subarray(0, room));
          size += room;
          res.destroy();
          settle(() => resolve({ status, headers: h, body: Buffer.concat(chunks), truncated: true }));
          return;
        }
        chunks.push(c);
        size += c.length;
      });
      res.on("end", () => settle(() => resolve({ status, headers: h, body: Buffer.concat(chunks), truncated: false })));
      res.on("error", (e) => settle(() => reject(mapNetError(e))));
      res.on("close", () => {
        if (!res.complete) settle(() => reject(new FetchFail("connect_failed", "bağlantı kurulamadı")));
      });
    };
    const req = target.tls ? httpsRequest({ ...common, servername: u.hostname, minVersion: "TLSv1.2", rejectUnauthorized: true }, onRes) : httpRequest(common, onRes);
    timers.push(
      setTimeout(
        () => {
          settle(() => reject(new FetchFail("timeout", "istek zaman aşımına uğradı")));
          req.destroy();
        },
        Math.max(1, deadline - Date.now()),
      ),
    );
    req.on("socket", (s) => {
      if (!s.connecting) return;
      const ct = setTimeout(
        () => {
          settle(() => reject(new FetchFail("timeout", "istek zaman aşımına uğradı")));
          req.destroy();
        },
        Math.max(1, connectMs),
      );
      timers.push(ct);
      s.once("connect", () => clearTimeout(ct));
    });
    req.on("error", (e) => settle(() => reject(mapNetError(e))));
    req.end();
  });
}

// ---------- ana işlev ----------

function inTestContext(): boolean {
  return typeof process.env.NODE_TEST_CONTEXT === "string" && process.env.NODE_TEST_CONTEXT.length > 0;
}

function normalizeHref(s: string): string | null {
  try {
    const u = new URL(s);
    u.hash = "";
    return u.href;
  } catch {
    return null;
  }
}

export async function fetchPublic(opts: FetchOptions): Promise<FetchResult> {
  const now = opts.now ?? (() => new Date());
  const startedAt = Date.now();
  const totalMs = Math.min(TOTAL_TIMEOUT_MS, Math.max(1, opts.limits?.totalMs ?? TOTAL_TIMEOUT_MS));
  const connectMs = Math.min(CONNECT_TIMEOUT_MS, Math.max(1, opts.limits?.connectMs ?? CONNECT_TIMEOUT_MS));
  const deadline = startedAt + totalMs;
  const rawUrl = typeof opts.url === "string" ? opts.url : "";
  let host = "-";
  let pathHash = sha256Hex(rawUrl.slice(0, 5000));
  const purpose = redactString(String(opts.purpose ?? "")).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 200);

  // Her çıkış tek yerden geçer: net_fetches satırı + denetim kaydı. Kayıt yazılamazsa içerik DÖNMEZ.
  const done = (result: FetchResult, info: { finalHost?: string; finalPathHash?: string; redirects?: number; status?: number; contentType?: string; bytes?: number; sha256?: string } = {}): FetchResult => {
    const outcome = result.ok ? "ok" : result.code;
    const approvedBy = `${redactString(String(opts.approvedBy?.kind ?? "?"))}:${redactString(String(opts.approvedBy?.id ?? "?")).slice(0, 80)}`;
    try {
      opts.db
        .prepare("INSERT INTO net_fetches (id, ts, host, path_sha256, final_host, final_path_sha256, redirect_count, status, content_type, bytes, sha256, outcome, approved_by, purpose) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(randomUUID(), now().toISOString(), host, pathHash, info.finalHost ?? null, info.finalPathHash ?? null, info.redirects ?? 0, info.status ?? null, info.contentType ? info.contentType.slice(0, 100) : null, info.bytes ?? 0, info.sha256 ?? null, outcome, approvedBy, purpose);
      opts.audit.record({
        initiator: { kind: String(opts.approvedBy?.kind ?? "unknown"), id: String(opts.approvedBy?.id ?? "unknown") },
        action: "net.fetch",
        decision: result.ok ? "allow" : "deny",
        result: outcome,
        details: { host, finalHost: info.finalHost ?? null, pathSha256: pathHash, finalPathSha256: info.finalPathHash ?? null, redirects: info.redirects ?? 0, status: info.status ?? null, bytes: info.bytes ?? 0, sha256: info.sha256 ?? null, outcome },
      });
    } catch {
      return { ok: false, code: "audit_failed", message: "getirme kaydı yazılamadı; sonuç verilmedi" };
    }
    return result;
  };
  const fail = (code: string, message: string, info: Parameters<typeof done>[1] = {}, status?: number, redirectTo?: string): FetchResult => done({ ok: false, code, message, ...(status !== undefined ? { status } : {}), ...(redirectTo !== undefined ? { redirectTo } : {}) }, info);

  if (opts.approvedBy?.kind !== "user") return fail("user_required", "internete yalnız kullanıcı çıkabilir; ajan getiremez");
  if (!opts.settings.enabled) return fail("net_disabled", HOW_TO_ENABLE);
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") return fail("bad_config", "sertifika doğrulaması kapatılmış; güvenlik için internet erişimi reddedildi");
  if (opts.transportOverride && !inTestContext()) return fail("bad_config", "aktarım geçersiz kılma yalnız testlerde kullanılabilir");

  const first = parseTarget(opts.url);
  if (!first.ok) return fail(first.code, first.message);
  host = first.host;
  pathHash = sha256Hex(`${first.url.pathname}${first.url.search}`);
  if (!hostAllowed(first.host, opts.settings.allowedDomains)) {
    // İzinsiz ana bilgisayar adı kullanıcı denetimli veri taşıyabilir (alt alan adı): kayda yalnız özeti yazılır.
    host = `sha256:${sha256Hex(first.host)}`;
    return fail("host_not_allowed", "bu ana bilgisayar izinli değil");
  }
  if (opts.settings.perUseApproval) {
    const wanted = first.url.href;
    // Bilet varsa BU URL için tüketilir (tek kullanımlık; yanlış URL'de de yanar). Yoksa yalnız bilet doğrulamasından geçmiş iç `approval` kabul edilir.
    const granted = opts.ticket !== undefined ? (opts.tickets ?? sharedTickets).redeem(opts.ticket, wanted) : opts.approval;
    const ok = granted?.grantedBy === "user" && Array.isArray(granted.urls) && granted.urls.some((u) => typeof u === "string" && normalizeHref(u) === wanted);
    if (!ok) return fail("approval_required", "bu adrese çıkmak için kullanıcı onayı gerekir");
  }
  const release = (opts.limiter ?? sharedLimiter).acquire();
  if (!release) return fail("rate_limited", "çok fazla getirme isteği; biraz bekleyin");

  const resolver = opts.resolver ?? defaultResolver;
  let current = first.url;
  let redirects = 0;
  try {
    for (;;) {
      const hostNow = current.hostname.toLowerCase();
      let addrs: Array<{ address: string; family: number }>;
      try {
        addrs = await withTimeout(resolver(hostNow), deadline - Date.now(), () => new FetchFail("timeout", "istek zaman aşımına uğradı"));
      } catch (e) {
        if (e instanceof FetchFail) throw e;
        throw new FetchFail("dns_failed", "ana bilgisayar çözülemedi");
      }
      if (!Array.isArray(addrs) || addrs.length === 0 || addrs.length > MAX_ADDRESSES) throw new FetchFail("dns_failed", "ana bilgisayar çözülemedi");
      // TÜM adresler denetlenir: biri bile özel/yerel/ayrılmışsa ret.
      if (addrs.some((a) => typeof a?.address !== "string" || isBlockedAddress(a.address))) throw new FetchFail("private_address", "özel ağ adresi reddedildi");
      const pinned = (addrs.find((a) => isIP(a.address) === 4) ?? addrs[0]) as { address: string };

      const onResponse = (status: number, h: Record<string, string>): Verdict => {
        if (REDIRECTS.has(status)) return "skip";
        if (status === 204) return "skip";
        if (status < 200 || status >= 300) return "skip";
        const enc = (h["content-encoding"] ?? "identity").trim().toLowerCase();
        if (enc !== "" && enc !== "identity") return new FetchFail("unsupported_content", "desteklenmeyen içerik türü ya da kodlaması");
        if (!ALLOWED_CONTENT_TYPES.includes(mediaType(h["content-type"]))) return new FetchFail("unsupported_content", "desteklenmeyen içerik türü ya da kodlaması");
        return "read";
      };
      const raw = await requestOnce(current, pinned.address, opts.transportOverride, deadline, connectMs, onResponse).catch((e: unknown) => {
        throw mapNetError(e);
      });

      if (REDIRECTS.has(raw.status)) {
        if (redirects >= MAX_REDIRECTS) throw new FetchFail("too_many_redirects", "çok fazla yönlendirme");
        const loc = raw.headers.location;
        if (typeof loc !== "string" || loc.length === 0 || loc.length > 2000) throw new FetchFail("bad_redirect", "yönlendirme geçersiz");
        let next: URL;
        try {
          next = new URL(loc, current.href);
        } catch {
          throw new FetchFail("bad_redirect", "yönlendirme geçersiz");
        }
        if (current.protocol === "https:" && next.protocol === "http:") throw new FetchFail("https_downgrade", "https'ten http'ye yönlendirme reddedildi");
        const t = parseTarget(next.href);
        if (!t.ok) throw new FetchFail(t.code, t.message);
        if (!hostAllowed(t.host, opts.settings.allowedDomains)) throw new FetchFail("host_not_allowed", "bu ana bilgisayar izinli değil");
        // Onay yalnız ilk ana bilgisayarı kapsar: başka bir ana bilgisayara yönlendirme için kullanıcı yeni bilet almalıdır.
        if (opts.settings.perUseApproval && t.host !== first.host) {
          const f = new FetchFail("redirect_needs_approval", "yönlendirme başka bir ana bilgisayara gidiyor; yeni onay gerekir");
          f.redirectTo = t.url.href;
          throw f;
        }
        redirects++;
        current = t.url;
        continue;
      }
      if (raw.status < 200 || raw.status >= 300) throw new FetchFail("http_status", "sunucu başarısız bir durum kodu döndürdü", raw.status);

      const contentType = mediaType(raw.headers["content-type"]);
      const digest = sha256Hex(raw.body);
      let decoded: string;
      try {
        const cs = /charset\s*=\s*["']?([A-Za-z0-9_.:-]{1,40})/i.exec(raw.headers["content-type"] ?? "")?.[1] ?? "utf-8";
        decoded = new TextDecoder(cs).decode(raw.body);
      } catch {
        decoded = new TextDecoder("utf-8").decode(raw.body);
      }
      const text = contentType === "text/html" ? htmlToText(decoded) : plainToText(decoded);
      const clip = clipBytes(text, MAX_TEXT_BYTES);
      const result: FetchOk = {
        ok: true,
        url: first.url.href,
        finalUrl: current.href,
        fetchedAt: now().toISOString(),
        status: raw.status,
        contentType,
        bytes: raw.body.length,
        sha256: digest,
        text: clip.text,
        truncated: raw.truncated || clip.clipped,
        untrusted: true,
      };
      return done(result, { finalHost: current.hostname, finalPathHash: sha256Hex(`${current.pathname}${current.search}`), redirects, status: raw.status, contentType, bytes: raw.body.length, sha256: digest });
    }
  } catch (e) {
    const f = e instanceof FetchFail ? e : new FetchFail("connect_failed", "bağlantı kurulamadı");
    return fail(f.code, f.message, { finalHost: current.hostname, finalPathHash: sha256Hex(`${current.pathname}${current.search}`), redirects, ...(f.status !== undefined ? { status: f.status } : {}) }, f.status, f.redirectTo);
  } finally {
    release();
  }
}

