// AgentMom terminal komutu (Faz 8, M1). Yazan: Claude [İP:AgentMom Faz 8].
// Kullanım: node src/cli/agentmom.ts <durum|gorevler|onay|borc|kararlar|ui|yardim>
// Yalnızca yerel sunucuyla (127.0.0.1) konuşur; belirteç dosyadan okunur, ASLA yazdırılmaz. Model çağrısı yok, ağ bağımlılığı yok.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { DEBT_TR, STATE_TR, TOKEN_RE, LOOPBACK, clean, getJson } from "./common.ts";
import type { CliIo } from "./common.ts";
export { DEBT_TR, STATE_TR, TOKEN_RE, LOOPBACK, clean, getJson };
export type { CliIo };

export const HELP = [
  "AgentMom komutları:",
  "  durum     sağlık ve genel özet",
  "  gorevler  son görevler",
  "  onay      onay bekleyen görevler",
  "  borc      varsayım borcu (kırık, gecikmiş, bekleyen)",
  "  kararlar  incelemesi gereken kararlar",
  "  ui        paneli tarayıcıda açar (belirteç yazdırılmaz)",
  "Sunucu çalışmıyorsa önce: npm start",
].join("\n");

export async function runCli(argv: string[], io: CliIo): Promise<number> {
  const cmd = (argv[0] ?? "yardim").toLowerCase();
  if (!LOOPBACK.test(io.baseUrl)) {
    io.err("Güvenlik: yalnızca yerel sunucuya (127.0.0.1) bağlanılır; belirteç başka bir adrese gönderilmez.");
    return 2;
  }
  if (cmd === "yardim" || cmd === "help" || cmd === "--help" || cmd === "-h") {
    io.out(HELP);
    return 0;
  }
  const known = ["durum", "status", "gorevler", "tasks", "onay", "approvals", "borc", "debt", "kararlar", "decisions", "ui"];
  if (!known.includes(cmd)) {
    io.err(`Bilinmeyen komut: ${clean(cmd)}\n${HELP}`);
    return 2;
  }
  let token: string;
  try {
    token = io.readToken().trim();
  } catch {
    io.err("Oturum belirteci okunamadı. Sunucu hiç başlatılmadı mı? (npm start)");
    return 1;
  }
  if (!TOKEN_RE.test(token)) {
    io.err("Belirteç dosyası beklenen biçimde değil.");
    return 1;
  }
  try {
    if (cmd === "ui") {
      io.openUrl(`${io.baseUrl}/#token=${token}`);
      io.out("Panel tarayıcıda açılıyor (belirteç adres parçasında, sunucuya gönderilmez ve açılışta adres çubuğundan silinir).");
      return 0;
    }
    if (cmd === "durum" || cmd === "status") {
      const h = await getJson(io, "/health", null);
      const t = await getJson(io, "/api/tasks", token);
      if (t.status === 401) return unauthorized(io);
      const tasks: any[] = t.json?.tasks ?? [];
      const awaiting = tasks.filter((x) => x.state === "awaiting_approval").length;
      const debt = (await getJson(io, "/api/assumption-debt", token)).json?.debt ?? [];
      const decs: any[] = (await getJson(io, "/api/decisions", token)).json?.decisions ?? [];
      io.out(`Sağlık: ${h.json?.status === "green" ? "yeşil" : "KIRMIZI"}${(h.json?.checks ?? []).filter((c: any) => !c.ok).map((c: any) => `\n  ✗ ${clean(c.name)}: ${clean(c.detail)}`).join("")}`);
      io.out(`Görevler: ${tasks.length} (onay bekleyen: ${awaiting})`);
      io.out(`Varsayım borcu: ${debt.length} (kırık: ${debt.filter((d: any) => d.kind === "broken").length})`);
      io.out(`İncelemesi gereken karar: ${decs.filter((d) => d.reviewState !== "ok").length}`);
      return h.json?.status === "green" ? 0 : 1;
    }
    if (cmd === "gorevler" || cmd === "tasks" || cmd === "onay" || cmd === "approvals") {
      const r = await getJson(io, "/api/tasks", token);
      if (r.status === 401) return unauthorized(io);
      let tasks: any[] = r.json?.tasks ?? [];
      if (cmd === "onay" || cmd === "approvals") tasks = tasks.filter((t) => t.state === "awaiting_approval");
      if (!tasks.length) io.out(cmd === "onay" || cmd === "approvals" ? "Onay bekleyen görev yok." : "Henüz görev yok.");
      for (const t of tasks.slice(0, 30)) io.out(`${clean(t.id).slice(0, 8)}  ${clean(Object.hasOwn(STATE_TR, String(t.state)) ? STATE_TR[t.state] : t.state).padEnd(14)} ${clean(t.title)}  [${clean(t.requestedAction)}]`);
      if (cmd === "onay" || cmd === "approvals") if (tasks.length) io.out("Onaylamak/reddetmek için paneli kullanın: ui");
      return 0;
    }
    if (cmd === "borc" || cmd === "debt") {
      const r = await getJson(io, "/api/assumption-debt", token);
      if (r.status === 401) return unauthorized(io);
      const debt: any[] = r.json?.debt ?? [];
      if (!debt.length) io.out("Varsayım borcu yok.");
      for (const d of debt.slice(0, 30)) io.out(`${(Object.hasOwn(DEBT_TR, String(d.kind)) ? (DEBT_TR[d.kind] as string) : clean(d.kind)).padEnd(9)} ${clean(d.text)}  ← ${clean(d.decisionTitle)}${d.overdueDays ? ` (${Number(d.overdueDays)} gün gecikti)` : ""}`);
      return 0;
    }
    const r = await getJson(io, "/api/decisions", token);
    if (r.status === 401) return unauthorized(io);
    const due: any[] = (r.json?.decisions ?? []).filter((d: any) => d.reviewState !== "ok");
    if (!due.length) io.out("İncelemesi gereken karar yok.");
    for (const d of due) io.out(`${d.reviewState === "at_risk" ? "RİSK     " : "İNCELE   "} ${clean(d.title)} — ${clean((d.reviewReasons ?? []).join("; "))}`);
    return 0;
  } catch (e) {
    io.err(`Sunucuya ulaşılamadı (${clean((e as Error).message)}). Çalışıyor mu? npm start`);
    return 1;
  }
}

function unauthorized(io: CliIo): number {
  io.err("Belirteç geçersiz: sunucu yeniden başlatılınca belirteç yenilenir; komutu tekrar deneyin.");
  return 1;
}

// Real wiring (only when run directly; the tests inject their own io).
if (import.meta.main) {
  const stateDir = resolve(process.env.AGENTMOM_STATE_DIR ?? join(process.cwd(), "..", "agentmom-state"));
  const port = process.env.AGENTMOM_PORT ?? "8787";
  const io: CliIo = {
    baseUrl: process.env.AGENTMOM_URL ?? `http://127.0.0.1:${port}`,
    fetch: (url, init) => fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(10_000) }) as unknown as ReturnType<CliIo["fetch"]>,
    readToken: () => readFileSync(join(stateDir, "token", "session.token"), "utf8"),
    out: (l) => console.log(l),
    err: (l) => console.error(l),
    openUrl: (url) => {
      spawn("cmd.exe", ["/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true }).unref();
    },
  };
  const args = process.argv.slice(2);
  if ((args.length === 0 && process.stdin.isTTY && process.stdout.isTTY) || (args.length === 1 && args[0] === "repl")) {
    // Interactive session (Claude Code style): in a real terminal, or forced with the argument `repl` (scripted use); other runs print the help text.
    const { createInterface } = await import("node:readline");
    const { runRepl } = await import("./repl.ts");
    const { lstatSync } = await import("node:fs");
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY), historySize: 200 });
    let busy = false;
    let stop = false;
    // Lines are queued as they arrive (piped input delivers many at once; rl.question would drop the ones that come between two questions).
    const lineQueue: string[] = [];
    let waiter: ((l: string | null) => void) | null = null;
    let closed = false;
    rl.on("line", (l) => {
      if (waiter) {
        const w = waiter;
        waiter = null;
        w(l);
      } else lineQueue.push(l);
    });
    rl.on("close", () => {
      closed = true;
      if (waiter) {
        const w = waiter;
        waiter = null;
        w(null);
      }
    });
    rl.on("SIGINT", () => {
      if (busy) stop = true;
      else rl.close();
    });
    const memFile = join(process.cwd(), "AGENTMOM.md");
    const code = await runRepl({
      ...io,
      color: !process.env.NO_COLOR && Boolean(process.stdout.isTTY),
      ask: (prompt, opts) => {
        busy = false;
        stop = false;
        process.stdout.write(prompt);
        if (opts?.fresh) {
          // A permission prompt only accepts a line typed AFTER it appeared; pre-typed/pasted/piped lines are discarded, and without a real terminal it cannot be answered at all.
          lineQueue.length = 0;
          if (!process.stdin.isTTY) return Promise.resolve(null);
        }
        const next = lineQueue.shift();
        if (next !== undefined) {
          busy = true;
          return Promise.resolve(next);
        }
        if (closed) return Promise.resolve(null);
        return new Promise<string | null>((ok) => {
          waiter = (l) => {
            busy = l !== null;
            ok(l);
          };
        });
      },
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      interrupted: () => stop,
      runBackup: () =>
        new Promise((ok) => {
          const child = spawn(process.execPath, [join(import.meta.dirname, "yedek.ts"), "yedekle"], { cwd: process.cwd(), env: process.env, windowsHide: true, timeout: 120_000 });
          let out = "";
          child.stdout.on("data", (d: Buffer) => (out += d.toString()));
          child.stderr.on("data", (d: Buffer) => (out += d.toString()));
          child.on("close", (code) => ok({ code: code ?? 1, out }));
          child.on("error", (e) => ok({ code: 1, out: String(e.message) }));
        }),
      readMemoryFile: () => {
        // lstat, not stat: a symlinked AGENTMOM.md (e.g. in a cloned untrusted repository) must never be followed to some other file.
        try {
          const st = lstatSync(memFile);
          return st.isFile() && !st.isSymbolicLink() && st.size <= 20_000 ? readFileSync(memFile, "utf8") : null;
        } catch {
          return null;
        }
      },
    });
    rl.close();
    process.exit(code);
  }
  runCli(args, io).then((code) => process.exit(code));
}
