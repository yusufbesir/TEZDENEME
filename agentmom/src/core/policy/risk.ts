// Risk değerlendirmesi (madde 11, D5a). Yazan: Claude [İP:AgentMom D5a]; sahip: Yusuf. Yalnız bu dosyayı yazan yapay zeka değiştirir, diğerleri öneri sunar.
// SAF ve deterministik: aynı girdi her zaman aynı sonucu verir; dosya sistemi, ağ, saat ve model kullanılmaz (yollar yalnız metin olarak karşılaştırılır).
// Yalnız BİLGİDİR: politika kararını değiştirmez, sunucu buna göre ek kural uygulamaz; karar kullanıcıdadır.
import { basename, dirname, isAbsolute, resolve } from "node:path";
import { isInside } from "./engine.ts";
import { semanticsFor } from "./action-semantics.ts";
import { ACTION_TYPES } from "./types.ts";
import type { AutonomyContract } from "./types.ts";

const POLICY_ACTIONS: ReadonlySet<string> = new Set(ACTION_TYPES);

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskInput {
  action: string;
  target?: string | undefined;
  command?: string | undefined;
  provider?: string | undefined;
  routeKind?: string | undefined;
  contract: Pick<AutonomyContract, "allowedDirs" | "allowedActions" | "allowedProviders" | "trustedRepos" | "forbiddenDirs" | "paidRoute"> | undefined;
}

export interface RiskAssessment {
  level: RiskLevel;
  score: number;
  reasons: string[];
}

// Eylem tabanı (0-100 ölçeğinde başlangıç puanı).
export const ACTION_BASE: Readonly<Record<string, number>> = Object.freeze({
  "file.read": 5,
  "task.create": 5,
  "verification.run": 10,
  "provider.test": 5,
  "backup.create": 5,
  "subsession.create": 5,
  "subsession.rename": 5,
  "subsession.pin": 5,
  "subsession.archive": 5,
  "task.contract": 10,
  "memory.add": 10,
  "task.deny": 10,
  "provider.enable": 15,
  "provider.disable": 15,
  "provider.call": 20,
  "provider.switch": 20,
  "task.approve": 20,
  "file.write": 25,
  "workflow.created": 25,
  "memory.export": 25,
  "file.recycle": 30,
  "network.request": 50,
  "shell.exec": 50,
  "policy.grant": 55,
});
const UNKNOWN_ACTION_BASE = 40;

export const WEIGHTS = Object.freeze({
  forbidden: 35,
  nearForbidden: 10,
  outsideAllowed: 20,
  configFile: 15,
  driveRoot: 25,
  repoRoot: 15,
  paidUnapproved: 20,
  paidApproved: 10,
  deleteCommand: 25,
  dynamicCommand: 20,
  irreversible: 15,
  partial: 5,
  actionNotInContract: 10,
  providerNotInContract: 10,
});

const CONFIG_EXT = new Set([".ps1", ".psm1", ".bat", ".sh", ".cmd", ".json", ".vbs", ".reg"]);
const CONFIG_NAMES = new Set(["package.json", "package-lock.json", "user-config.json", ".npmrc", ".gitconfig", "settings.json", "settings.local.json"]);
const DELETE_RE = [
  /\brm\b/i,
  /\brmdir\b/i,
  /\brd\s+\/s/i,
  /\bdel\b/i,
  /\berase\b/i,
  /\bunlink\b/i,
  /remove-item/i,
  /clear-content/i,
  /\bformat(\.com)?\s+[a-z]:/i,
  /\bdrop\s+(table|database|trigger|index)\b/i,
  /\bdelete\s+from\b/i,
  /\btruncate\b/i,
  /\bgit\s+clean\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+push\b[^\n]*(--force|-f\b)/i,
  /\bshred\b/i,
  /\bcipher\s+\/w/i,
];
const DYNAMIC_RE = [
  /\$\(/,
  /`[^`]+`/,
  /\binvoke-expression\b/i,
  /\biex\b/i,
  /\beval\b/i,
  /-enc(odedcommand)?\b/i,
  /\bfrombase64string\b/i,
  /\bbase64\s+(-d|--decode)\b/i,
  /\|\s*(sh|bash|zsh|pwsh|powershell|cmd|node|python3?)\b/i,
  /\b(curl|wget|iwr|invoke-webrequest)\b/i,
  /\bstart-process\b/i,
  /\bnode\s+-e\b/i,
  /\bpython3?\s+-c\b/i,
];

// Kayıtlı bir görev isteğinden (tasks.request_json) risk girdisi çıkarır; eksik alan yok sayılır, uydurulmaz.
export function assessTaskRequest(requestedAction: string, request: unknown, contract: RiskInput["contract"]): RiskAssessment {
  const r = request !== null && typeof request === "object" && !Array.isArray(request) ? (request as Record<string, unknown>) : {};
  const route = r.route !== null && typeof r.route === "object" && !Array.isArray(r.route) ? (r.route as Record<string, unknown>) : {};
  const str = (v: unknown): string | undefined => (typeof v === "string" && v.length > 0 ? v : undefined);
  return assessRisk({
    action: requestedAction,
    target: str(r.target),
    command: str(r.command),
    provider: str(route.providerId) ?? str(r.provider),
    routeKind: str(route.kind),
    contract,
  });
}

export function levelFor(score: number): RiskLevel {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

// Bir hedef metni dosya yolu gibi mi? ("-", URL ya da boş değer yol sayılmaz.)
function looksLikePath(t: string): boolean {
  if (!t || t === "-" || /^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return false;
  return isAbsolute(t) || /[\\/]/.test(t) || /^[a-z]:/i.test(t);
}

function norm(p: string): string {
  return resolve(p).replace(/[\\/]+$/, "").toLowerCase();
}

function isDriveRoot(p: string): boolean {
  const abs = resolve(p);
  return dirname(abs) === abs;
}

function isConfigLike(p: string): boolean {
  const lower = p.replace(/\\/g, "/").toLowerCase();
  const name = basename(lower);
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  if (CONFIG_EXT.has(ext) || CONFIG_NAMES.has(name)) return true;
  if (name === ".git" || name === "hooks" || name.startsWith("user-config")) return true;
  return /(^|\/)\.git(\/|$)/.test(lower) || /(^|\/)hooks(\/|$)/.test(lower) || /(^|\/)\.claude(\/|$)/.test(lower) || /(^|\/)\.husky(\/|$)/.test(lower);
}

export function assessRisk(input: RiskInput): RiskAssessment {
  const reasons: string[] = [];
  const known = Object.hasOwn(ACTION_BASE, input.action);
  let score = known ? (ACTION_BASE[input.action] as number) : UNKNOWN_ACTION_BASE;
  reasons.push(known ? `eylem tabanı: ${input.action} (${score})` : `bilinmeyen eylem: ${input.action} (${score})`);
  const add = (w: number, why: string): void => {
    score += w;
    reasons.push(`${why} (+${w})`);
  };
  const c = input.contract;

  // Yalnız politika motorunun eylemleri sözleşmeyle karşılaştırılır; kullanıcı arayüzü eylemleri (alt oturum, yedek...) sözleşmenin konusu değildir.
  if (c && POLICY_ACTIONS.has(input.action) && !(c.allowedActions as readonly string[]).includes(input.action)) add(WEIGHTS.actionNotInContract, "eylem sözleşmede izinli değil");

  const target = typeof input.target === "string" ? input.target.trim() : "";
  if (looksLikePath(target)) {
    const forbidden = c?.forbiddenDirs ?? [];
    const inForbidden = forbidden.some((d) => isInside(d, target) || isInside(target, d));
    if (inForbidden) add(WEIGHTS.forbidden, "hedef yasak bir klasörün içinde ya da onu kapsıyor");
    else if (forbidden.some((d) => isInside(dirname(resolve(d)), target) || isInside(dirname(resolve(target)), d))) add(WEIGHTS.nearForbidden, "hedef yasak bir klasöre yakın (aynı üst klasör)");
    if (c && !c.allowedDirs.some((d) => isInside(d, target))) add(WEIGHTS.outsideAllowed, "hedef izinli klasörlerin dışında");
    if (isConfigLike(target)) add(WEIGHTS.configFile, "hedef yapılandırma/betik/kanca dosyası ya da klasörü");
    if (isDriveRoot(target)) add(WEIGHTS.driveRoot, "hedef bir sürücü kökü (çok geniş kapsam)");
    else if (c && [...c.allowedDirs, ...c.trustedRepos].some((d) => norm(d) === norm(target))) add(WEIGHTS.repoRoot, "hedef depo/izinli kök klasörün tamamı (geniş kapsam)");
  }

  if (input.routeKind === "api_paid") {
    if (c?.paidRoute === "approved") add(WEIGHTS.paidApproved, "ücretli rota (harcama olur)");
    else add(WEIGHTS.paidUnapproved, "ücretli rota ve sözleşme ücretli yolu onaylamamış");
  }

  if (input.provider && c && !c.allowedProviders.includes(input.provider)) add(WEIGHTS.providerNotInContract, "sağlayıcı sözleşmede yok");

  const cmd = typeof input.command === "string" ? input.command : "";
  if (cmd) {
    if (DELETE_RE.some((re) => re.test(cmd))) add(WEIGHTS.deleteCommand, "komutta silme ya da geri alınamaz yapı var");
    if (DYNAMIC_RE.some((re) => re.test(cmd))) add(WEIGHTS.dynamicCommand, "komutta dinamik yapı var (çalışma anında üretilen/indirilen kod)");
  }

  const sem = semanticsFor(input.action);
  if (sem?.reversible === "no") add(WEIGHTS.irreversible, "eylem geri alınamaz");
  else if (sem?.reversible === "partial") add(WEIGHTS.partial, "eylem yalnız kısmen geri alınabilir");

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  return { level: levelFor(finalScore), score: finalScore, reasons };
}
