// AgentMom etkileşimli komut oturumu (Faz 10, Claude Code benzeri). Yazan: Claude [İP:AgentMom Faz 10].
// `npm run agentmom` argümansız (terminalde) açılır: giriş satırı + geçmiş (yön tuşları), "/" komutları, serbest metin = görev kaydı,
// eylem satırları (⏺ / ⎿), izin istemleri (eylem + hedef gösterilir; varsayılan = atla), canlı akış (/izle).
// Güvenlik: yalnızca 127.0.0.1; belirteç ASLA yazdırılmaz; model çağrısı, ağ bağımlılığı, dosya yazma YOK (yalnız /yedek, kendi komutu);
// onay/ret yalnızca yerel sunucunun kullanıcı uçlarıyla yapılır, politika motoruna dokunulmaz.
import { clean, DEBT_TR, getJson, LOOPBACK, STATE_TR, TOKEN_RE } from "./common.ts";
import type { CliIo } from "./common.ts";

export interface ReplIo extends CliIo {
  // fresh: true = a permission/confirmation prompt: anything typed or pasted BEFORE the prompt appeared must not count as the answer (the real implementation drops it).
  ask: (prompt: string, opts?: { fresh?: boolean }) => Promise<string | null>; // null: girdi kapandı
  color: boolean;
  sleep: (ms: number) => Promise<void>;
  interrupted: () => boolean;
  runBackup: () => Promise<{ code: number; out: string }>;
  readMemoryFile: () => string | null;
}

export const REPL_HELP = [
  "Komutlar (yazmaya / ile başlayın):",
  "  /durum        sağlık ve genel özet",
  "  /gorevler     son görevler",
  "  /onay         onay bekleyen görevler: eylem + hedef gösterilir, izin ver / reddet / atla",
  "  /borc         varsayım borcu",
  "  /kararlar     incelemesi gereken kararlar",
  "  /beceriler    onay bekleyen beceriler",
  "  /saglayicilar sağlayıcı kapasite özeti",
  "  /izle [n]     n tur (varsayılan 20 x 2 sn) yeni eylemleri ve görev durum değişimlerini akıtır; Ctrl+C durdurur",
  "  /yedek        doğrulamalı yedek alır (anahtar içermez)",
  "  /hafiza       AGENTMOM.md (proje hafıza dosyası) varsa gösterir",
  "  /ui           Komuta Panelini tarayıcıda açar",
  "  /cik          çıkış",
  "Serbest metin yazarsanız görev KAYDI açılır (önce sorulur). Hiçbir komut model çağırmaz; politika ve onay kuralları sunucudadır.",
].join("\n");

const SLASH = new Set(["durum", "gorevler", "onay", "borc", "kararlar", "beceriler", "saglayicilar", "izle", "yedek", "hafiza", "ui", "yardim", "cik"]);

export class Repl {
  private readonly io: ReplIo;
  private token = "";
  private readonly seenAudit = new Set<string>();

  constructor(io: ReplIo) {
    this.io = io;
  }

  private paint(code: string, text: string): string {
    return this.io.color ? `\u001b[${code}m${text}\u001b[0m` : text;
  }

  private head(text: string): void {
    this.io.out(`${this.paint("38;5;209", "⏺")} ${text}`);
  }

  private sub(text: string): void {
    this.io.out(`  ${this.paint("2", "⎿")} ${text}`);
  }

  private async api(path: string, method = "GET", body?: unknown): Promise<{ status: number; json: any }> {
    return getJson(this.io, path, this.token, method, body);
  }

  // Returns false when the session should end.
  async start(): Promise<boolean> {
    if (!LOOPBACK.test(this.io.baseUrl)) {
      this.io.err("Güvenlik: yalnızca yerel sunucuya (127.0.0.1) bağlanılır; belirteç başka bir adrese gönderilmez.");
      return false;
    }
    try {
      this.token = this.io.readToken().trim();
    } catch {
      this.io.err("Oturum belirteci okunamadı. Sunucu hiç başlatılmadı mı? (npm start)");
      return false;
    }
    if (!TOKEN_RE.test(this.token)) {
      this.io.err("Belirteç dosyası beklenen biçimde değil.");
      return false;
    }
    this.io.out(`${this.paint("38;5;209", "✻")} ${this.paint("1", "AgentMom")} — yerel komuta oturumu`);
    try {
      const h = await getJson(this.io, "/health", null);
      const t = await this.api("/api/tasks");
      if (t.status === 401) {
        this.io.err("Belirteç geçersiz: sunucu yeniden başlatılınca yenilenir; yeniden açın.");
        return false;
      }
      const awaiting = ((t.json?.tasks ?? []) as any[]).filter((x) => x.state === "awaiting_approval").length;
      this.sub(`sunucu: ${clean(this.io.baseUrl)} · sağlık: ${h.json?.status === "green" ? "yeşil" : "KIRMIZI"} · onay bekleyen: ${awaiting}`);
    } catch (e) {
      this.io.err(`Sunucuya ulaşılamadı (${clean((e as Error).message)}). Çalışıyor mu? npm start`);
      return false;
    }
    this.sub("/yardim komutları gösterir · serbest metin görev kaydı açar · /cik çıkar");
    return true;
  }

  async loop(): Promise<void> {
    for (;;) {
      const line = await this.io.ask(`${this.paint("38;5;209", "agentmom ›")} `);
      if (line === null) return;
      if (!(await this.handle(line))) return;
    }
  }

  async handle(raw: string): Promise<boolean> {
    const line = raw.trim();
    if (!line) return true;
    try {
      if (!line.startsWith("/")) {
        await this.freeText(line);
        return true;
      }
      const [name = "", ...args] = line.slice(1).split(/\s+/);
      const cmd = name.toLowerCase();
      if (!SLASH.has(cmd)) {
        this.head(`Bilinmeyen komut: /${clean(cmd).slice(0, 40)}`);
        this.sub("/yardim ile komutlara bakın");
        return true;
      }
      switch (cmd) {
        case "cik":
          this.sub("görüşürüz");
          return false;
        case "yardim":
          this.io.out(REPL_HELP);
          break;
        case "durum":
          await this.status();
          break;
        case "gorevler":
          await this.tasks(false);
          break;
        case "onay":
          await this.approvals();
          break;
        case "borc":
          await this.debt();
          break;
        case "kararlar":
          await this.decisions();
          break;
        case "beceriler":
          await this.skills();
          break;
        case "saglayicilar":
          await this.providers();
          break;
        case "izle":
          await this.watch(args[0]);
          break;
        case "yedek":
          await this.backup();
          break;
        case "hafiza":
          this.memoryFile();
          break;
        case "ui":
          this.io.openUrl(`${this.io.baseUrl}/#token=${this.token}`);
          this.head("Panel tarayıcıda açılıyor");
          this.sub("belirteç adres parçasında; sunucuya gönderilmez, açılışta adres çubuğundan silinir");
          break;
      }
    } catch (e) {
      this.head("Hata");
      this.sub(`sunucuya ulaşılamadı ya da yanıt okunamadı: ${clean((e as Error).message)}`);
    }
    return true;
  }

  private async getList<T>(path: string, key: string): Promise<T[] | null> {
    const r = await this.api(path);
    if (r.status === 401) {
      this.head("Belirteç geçersiz");
      this.sub("sunucu yeniden başlatılmış olabilir; oturumu kapatıp yeniden açın");
      return null;
    }
    return (r.json?.[key] ?? []) as T[];
  }

  private async status(): Promise<void> {
    const h = await getJson(this.io, "/health", null);
    const tasks = await this.getList<any>("/api/tasks", "tasks");
    if (!tasks) return;
    const debt = (await this.getList<any>("/api/assumption-debt", "debt")) ?? [];
    const decs = (await this.getList<any>("/api/decisions", "decisions")) ?? [];
    this.head(`Sağlık: ${h.json?.status === "green" ? this.paint("32", "yeşil") : this.paint("31", "KIRMIZI")}`);
    for (const c of ((h.json?.checks ?? []) as any[]).filter((x) => !x.ok)) this.sub(`✗ ${clean(c.name)}: ${clean(c.detail)}`);
    this.sub(`görevler: ${tasks.length} (onay bekleyen: ${tasks.filter((t) => t.state === "awaiting_approval").length})`);
    this.sub(`varsayım borcu: ${debt.length} (kırık: ${debt.filter((d) => d.kind === "broken").length})`);
    this.sub(`incelemesi gereken karar: ${decs.filter((d) => d.reviewState !== "ok").length}`);
  }

  private async tasks(onlyAwaiting: boolean): Promise<any[]> {
    const all = (await this.getList<any>("/api/tasks", "tasks")) ?? [];
    const list = onlyAwaiting ? all.filter((t) => t.state === "awaiting_approval") : all;
    this.head(onlyAwaiting ? `Onay bekleyen görevler (${list.length})` : `Görevler (${list.length})`);
    if (!list.length) this.sub(onlyAwaiting ? "onay bekleyen görev yok" : "henüz görev yok");
    for (const t of list.slice(0, 30)) this.sub(`${clean(t.id).slice(0, 8)}  ${clean(Object.hasOwn(STATE_TR, String(t.state)) ? STATE_TR[t.state] : t.state).padEnd(14)} ${clean(t.title)}  [${clean(t.requestedAction)}]`);
    return list;
  }

  private async approvals(): Promise<void> {
    const list = await this.tasks(true);
    for (const t of list) {
      // The permission prompt shows WHAT will be allowed (action and target), not only the title; the default answer is "skip".
      this.io.out("");
      this.head(this.paint("33", "İzin isteniyor"));
      this.sub(`görev: ${clean(t.title)}`);
      this.sub(`eylem: ${clean(t.requestedAction)}`);
      this.sub(`hedef: ${clean(t.request?.target ?? "-")}`);
      this.sub(`politika kararı: ${clean(t.decision)}`);
      const ans = await this.io.ask("  İzin ver? [e]vet / [h]ayır / [a]tla (varsayılan atla) › ", { fresh: true });
      if (ans === null) return;
      const a = ans.trim().toLowerCase();
      if (a === "e" || a === "evet") await this.decide(t, "approve");
      else if (a === "h" || a === "hayir" || a === "hayır") await this.decide(t, "deny");
      else this.sub("atlandı");
    }
  }

  private async decide(t: any, verb: "approve" | "deny"): Promise<void> {
    // The list was fetched earlier: re-read the task now, act only if it is STILL waiting (another session may have decided already).
    const fresh = ((await this.api("/api/tasks")).json?.tasks ?? []).find((x: any) => String(x.id) === String(t.id));
    if (!fresh || fresh.state !== "awaiting_approval") {
      this.sub(`artık onay beklemiyor (durum: ${clean(fresh?.state ?? "bilinmiyor")}): işlem yapılmadı`);
      return;
    }
    const r = await this.api(`/api/tasks/${encodeURIComponent(String(t.id))}/${verb}`, "POST", {});
    if (r.status >= 400) this.sub(`işlem başarısız (${r.status}): ${clean(r.json?.error)}`);
    else this.sub(verb === "approve" ? this.paint("32", "onaylandı") : this.paint("31", "reddedildi"));
  }

  private async debt(): Promise<void> {
    const debt = (await this.getList<any>("/api/assumption-debt", "debt")) ?? [];
    this.head(`Varsayım borcu (${debt.length})`);
    if (!debt.length) this.sub("varsayım borcu yok");
    for (const d of debt.slice(0, 30)) this.sub(`${(Object.hasOwn(DEBT_TR, String(d.kind)) ? (DEBT_TR[d.kind] as string) : clean(d.kind)).padEnd(9)} ${clean(d.text)}  ← ${clean(d.decisionTitle)}${d.overdueDays ? ` (${Number(d.overdueDays)} gün gecikti)` : ""}`);
  }

  private async decisions(): Promise<void> {
    const due = ((await this.getList<any>("/api/decisions", "decisions")) ?? []).filter((d) => d.reviewState !== "ok");
    this.head(`İncelemesi gereken kararlar (${due.length})`);
    if (!due.length) this.sub("incelemesi gereken karar yok");
    for (const d of due) this.sub(`${d.reviewState === "at_risk" ? "RİSK   " : "İNCELE "} ${clean(d.title)} — ${clean((d.reviewReasons ?? []).join("; "))}`);
  }

  private async skills(): Promise<void> {
    const need = ((await this.getList<any>("/api/skills", "skills")) ?? []).filter((s) => s.state === "awaiting_approval");
    this.head(`Onay bekleyen beceriler (${need.length})`);
    if (!need.length) this.sub("yok");
    for (const s of need) this.sub(`${clean(s.name)}  risk sınıfı: ${clean(s.riskClass)}`);
  }

  private async providers(): Promise<void> {
    const list = (await this.getList<any>("/api/providers", "providers")) ?? [];
    this.head(`Sağlayıcılar (${list.length})`);
    let anyDown = false;
    for (const p of list) {
      const caps = (p.capabilities ?? []) as any[];
      const n = (s: string) => caps.filter((c) => c.status === s).length;
      // "execute" unavailable/unsupported = the provider cannot run work: say so plainly, never substitute another one silently.
      const exec = caps.find((c) => c.operation === "execute")?.status;
      const down = exec === "unavailable" || exec === "unsupported";
      if (down) anyDown = true;
      this.sub(`${down ? this.paint("31", "KULLANILAMIYOR ") : ""}${clean(p.displayName)} (${clean(p.id)}): doğrulanmış ${n("verified")} · kısmi ${n("partial")} · doğrulanmamış ${n("unverified")} · kullanılamaz ${n("unavailable")} · desteklenmez ${n("unsupported")}`);
    }
    if (anyDown) this.sub("Otomatik geçiş yok: kullanılamayan bir sağlayıcı yerine başkası kendiliğinden devreye girmez; karar sizindir.");
  }

  // Live stream: new audit events become action lines, task state changes are announced. Stops after n rounds or on Ctrl+C.
  private async watch(arg: string | undefined): Promise<void> {
    const rounds = Math.min(Math.max(Math.trunc(Number(arg ?? "20")) || 20, 1), 300);
    this.head(`Akış izleniyor (${rounds} tur, Ctrl+C durdurur)`);
    const states = new Map<string, string>();
    let first = true;
    for (let i = 0; i < rounds && !this.io.interrupted(); i++) {
      const [tasks, audit] = await Promise.all([this.api("/api/tasks"), this.api("/api/audit?limit=40")]);
      if (tasks.status === 401) {
        this.sub("belirteç geçersiz");
        return;
      }
      for (const t of (tasks.json?.tasks ?? []) as any[]) {
        const prev = states.get(String(t.id));
        if (prev !== undefined && prev !== t.state) this.head(`görev ${clean(t.id).slice(0, 8)}: ${clean(Object.hasOwn(STATE_TR, prev) ? STATE_TR[prev] : prev)} → ${clean(Object.hasOwn(STATE_TR, String(t.state)) ? STATE_TR[t.state] : t.state)}  ${clean(t.title)}`);
        states.set(String(t.id), String(t.state));
      }
      const events = ((audit.json?.events ?? []) as any[]).slice().reverse();
      for (const e of events) {
        const id = String(e.id);
        if (this.seenAudit.has(id)) continue;
        this.seenAudit.add(id);
        if (first && events.length - events.indexOf(e) > 5) continue; // first round: only the last few, for context
        this.head(`${clean(e.action)}`);
        this.sub(`${clean(e.result)} · ${clean(e.initiator?.kind)}:${clean(e.initiator?.id)}`);
      }
      first = false;
      if (i < rounds - 1) await this.io.sleep(2000);
    }
    this.sub(this.io.interrupted() ? "durduruldu" : "akış bitti");
  }

  private async backup(): Promise<void> {
    this.head("Yedek alınıyor");
    const r = await this.io.runBackup();
    for (const l of r.out.split("\n").filter(Boolean).slice(-6)) this.sub(clean(l));
    if (r.code !== 0) this.sub("yedek BAŞARISIZ (yukarıdaki mesaja bakın)");
  }

  private memoryFile(): void {
    const text = this.io.readMemoryFile();
    this.head("AGENTMOM.md (proje hafıza dosyası)");
    if (text === null) {
      this.sub("bulunamadı (isteğe bağlı; yalnızca okunur ve burada gösterilir, hiçbir yerde komut olarak yorumlanmaz)");
      return;
    }
    for (const l of text.split(/\r?\n/).slice(0, 40)) this.sub(clean(l));
  }

  // Free text only ever creates a task RECORD (no provider is started, no file is touched); the server's policy decides its state.
  private async freeText(text: string): Promise<void> {
    const title = text.slice(0, 200);
    this.head("Görev kaydı açılsın mı?");
    this.sub(`“${clean(title)}”  (eylem: task.create; hiçbir ajan başlatılmaz)`);
    const ans = await this.io.ask("  [e]vet / [h]ayır (varsayılan hayır) › ", { fresh: true });
    if (!ans || !["e", "evet"].includes(ans.trim().toLowerCase())) {
      this.sub("vazgeçildi");
      return;
    }
    const r = await this.api("/api/tasks", "POST", { title, request: { action: "task.create" } });
    if (r.status >= 400) this.sub(`reddedildi (${r.status}): ${clean(r.json?.error ?? r.json?.decision?.reason)}`);
    else this.sub(`kaydedildi: ${clean(r.json?.task?.id).slice(0, 8)} · durum: ${clean(Object.hasOwn(STATE_TR, String(r.json?.task?.state)) ? STATE_TR[r.json.task.state] : r.json?.task?.state)} · politika: ${clean(r.json?.decision?.decision)}`);
  }
}

export async function runRepl(io: ReplIo): Promise<number> {
  const repl = new Repl(io);
  if (!(await repl.start())) return 1;
  await repl.loop();
  return 0;
}
