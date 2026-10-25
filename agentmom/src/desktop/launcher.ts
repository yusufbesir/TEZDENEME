// AgentMom desktop launcher (Faz 11, slice 1). Owner: Claude [IP:AgentMom Faz 11].
// What it does, in order: (1) single-instance check, (2) starts the local server hidden if it is not already up, (3) asks the server for a ONE-TIME entry
// ticket (the session token is never put on a command line), (4) opens Edge in "app mode" (own window, no address bar/tabs) with an AgentMom-only profile
// on D:, (5) when the window closes, asks the server to quit gracefully (database closed) and removes its own lock file.
// No dependency beyond Node and the Microsoft Edge that ships with Windows. Everything the launcher decides is a pure function below so it can be tested.
import { spawn, type ChildProcess } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { dirname, join, resolve } from "node:path";

export const EDGE_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

export function findEdge(exists: (p: string) => boolean = existsSync, candidates: string[] = EDGE_CANDIDATES): string | null {
  return candidates.find((c) => exists(c)) ?? null;
}

// The window command line. It carries the ticket URL only; never the session token.
export function buildEdgeArgs(opts: { port: number; ticket: string; profileDir: string }): string[] {
  if (!/^\d{2,5}$/.test(String(opts.port))) throw new Error("invalid port");
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(opts.ticket)) throw new Error("invalid ticket");
  return [
    `--app=http://127.0.0.1:${opts.port}/desktop/enter?t=${opts.ticket}`,
    `--user-data-dir=${opts.profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-features=Translate,msEdgeSidebarV2,msUndersideButton,CalculateNativeWinOcclusion",
    "--window-size=1280,800",
    "--window-position=60,30",
  ];
}

export interface LockInfo {
  pid: number;
  port: number;
}

export function parseLock(text: string): LockInfo | null {
  try {
    const v = JSON.parse(text) as Partial<LockInfo>;
    return Number.isInteger(v.pid) && Number.isInteger(v.port) && (v.pid as number) > 0 ? { pid: v.pid as number, port: v.port as number } : null;
  } catch {
    return null;
  }
}

export function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

interface Reply {
  status: number;
  body: string;
}
function http(port: number, method: string, path: string, token?: string, timeoutMs = 3000): Promise<Reply> {
  return new Promise((ok, fail) => {
    const req = request(
      { host: "127.0.0.1", port, method, path, headers: { host: `127.0.0.1:${port}`, ...(token ? { authorization: `Bearer ${token}`, "content-type": "application/json", "content-length": 2 } : {}) }, timeout: timeoutMs },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => ok({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }));
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", fail);
    if (token) req.write("{}");
    req.end();
  });
}

async function serverUp(port: number): Promise<boolean> {
  try {
    const r = await http(port, "GET", "/health");
    return r.status === 200 || r.status === 503;
  } catch {
    return false;
  }
}

async function waitFor<T>(fn: () => Promise<T | null | false>, ms: number, stepMs = 250): Promise<T | null> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, stepMs));
  }
  return null;
}

export interface LauncherPaths {
  root: string;
  stateDir: string;
  profileDir: string;
  lockFile: string;
  logFile: string;
  tokenFile: string;
}

export function launcherPaths(root: string, env: NodeJS.ProcessEnv = process.env): LauncherPaths {
  const stateDir = resolve(env.AGENTMOM_STATE_DIR ?? join(root, "..", "agentmom-state"));
  const dir = join(stateDir, "desktop");
  return { root, stateDir, profileDir: resolve(env.AGENTMOM_PROFILE_DIR ?? join(dir, "edge-profile")), lockFile: join(dir, "launcher.lock"), logFile: join(dir, "server.log"), tokenFile: join(stateDir, "token", "session.token") };
}

// The session token is sent only to a listener that proves it holds the same token (a squatter on the port cannot).
export function expectedProof(token: string, nonce: string): string {
  return createHmac("sha256", token).update(`agentmom-desktop-proof:${nonce}`).digest("hex");
}
async function verifiedToken(p: LauncherPaths, port: number): Promise<string> {
  const token = readFileSync(p.tokenFile, "utf8").trim();
  const nonce = randomBytes(18).toString("base64url");
  const r = await http(port, "GET", `/desktop/proof?n=${nonce}`);
  const got = r.status === 200 ? String((JSON.parse(r.body) as { proof?: unknown }).proof ?? "") : "";
  const want = expectedProof(token, nonce);
  if (got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want))) throw new Error("the listener on this port did not prove it is the AgentMom server; token not sent");
  return token;
}

async function openWindow(p: LauncherPaths, port: number, edge: string): Promise<ChildProcess> {
  const token = await verifiedToken(p, port);
  const r = await http(port, "POST", "/api/desktop/ticket", token);
  if (r.status !== 200) throw new Error(`ticket refused (${r.status})`);
  const ticket = (JSON.parse(r.body) as { ticket: string }).ticket;
  mkdirSync(p.profileDir, { recursive: true });
  return spawn(edge, buildEdgeArgs({ port, ticket, profileDir: p.profileDir }), { stdio: "ignore", windowsHide: false });
}

export async function run(root: string, env: NodeJS.ProcessEnv = process.env): Promise<number> {
  const p = launcherPaths(root, env);
  const port = Number(env.AGENTMOM_PORT ?? 8787);
  const edge = findEdge();
  if (!edge) {
    console.error("Microsoft Edge bulunamadi; pencere acilamiyor. Sunucu baslatilmadi.");
    return 2;
  }
  mkdirSync(dirname(p.lockFile), { recursive: true });

  // Single instance. The lock is taken atomically ("wx"); an existing lock that is alive (same configured port, live pid, answering server) means
  // "just bring up another window on the running one". Only the configured port is ever contacted (a lock file cannot redirect the token elsewhere).
  let haveLock = false;
  try {
    closeSync(openSync(p.lockFile, "wx"));
    haveLock = true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
  }
  if (!haveLock) {
    const prior = parseLock(readFileSync(p.lockFile, "utf8"));
    if (prior && prior.port === port && pidAlive(prior.pid) && (await serverUp(port))) {
      await openWindow(p, port, edge);
      return 0;
    }
    // Closed (empty) or stale lock: take it over.
  }

  let server: ChildProcess | null = null;
  if (!(await serverUp(port))) {
    const log = openSync(p.logFile, "a");
    server = spawn(process.execPath, ["src/server/main.ts"], { cwd: root, env: { ...env, AGENTMOM_PORT: String(port) }, stdio: ["ignore", log, log], windowsHide: true });
    closeSync(log);
    const up = await waitFor(() => serverUp(port), 40_000);
    if (!up) {
      console.error(`Sunucu 40 sn icinde acilmadi; ayrinti: ${p.logFile}`);
      server.kill();
      return 3;
    }
  }
  writeFileSync(p.lockFile, JSON.stringify({ pid: process.pid, port }));

  const win = await openWindow(p, port, edge);
  await new Promise<void>((done) => win.on("exit", () => done()));

  // All windows of the AgentMom profile are closed (extra windows share the profile process, so this fires only after the last one).
  // Only a server THIS launcher started is stopped, gracefully (the server closes the database itself); a server that was already running is left alone.
  if (server) {
    try {
      const token = await verifiedToken(p, port);
      await http(port, "POST", "/api/desktop/quit", token);
    } catch {
      /* already gone */
    }
    await waitFor(async () => !(await serverUp(port)), 6000);
  }
  // The lock is marked closed by emptying it (nothing in AgentMom ever deletes a file): an empty lock is "not running".
  try {
    writeFileSync(p.lockFile, "");
  } catch {
    /* read-only state: next start treats a dead pid as a stale lock anyway */
  }
  return 0;
}

if (import.meta.main) {
  process.exit(await run(process.cwd()));
}
