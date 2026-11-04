// Zaman tetikleyicisi zamanlayıcısı (madde 13 genişlemesi, ADR-016). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// Dakikada bir AutomationEngine.tick(now) çağırır. Kendiliğinden kural doğurmaz: yalnız kullanıcının KURDUĞU zamanlı kuralları çalıştırır (karar ve sınırlar motorda).
// Zamanlayıcı unref'tir (süreci tek başına ayakta tutmaz), durdurulabilir; hata yutulmaz (stderr'e kısa, sırdan arındırılmış iz) ve süreci çökertmez.
import { redactString } from "../core/audit/redact.ts";
import type { AutomationEngine } from "./automation.ts";

export const DEFAULT_SCHEDULER_INTERVAL_MS = 60_000;

export interface AutomationScheduler {
  // Zamanlayıcıyı durdurur ve süren tick'in bitmesini bekler. Tekrar çağrılabilir.
  stop(): Promise<void>;
  // Sıradaki tick'i hemen çalıştırır (testler ve elle tetikleme); hata fırlatmaz.
  tickNow(): Promise<void>;
  readonly running: boolean;
}

export function startScheduler(engine: Pick<AutomationEngine, "tick">, opts: { intervalMs?: number; now?: () => Date } = {}): AutomationScheduler {
  const intervalMs = opts.intervalMs ?? DEFAULT_SCHEDULER_INTERVAL_MS;
  if (!Number.isInteger(intervalMs) || intervalMs < 1) throw new Error("intervalMs must be a positive integer");
  const now = opts.now ?? (() => new Date());
  let stopped = false;
  // Süren tick varsa yeni tick BAŞLATILMAZ (aynı söz verilir); stop() gerçekten süren tick'i bekler.
  let inflight: Promise<void> | null = null;

  const runTick = (): Promise<void> => {
    if (inflight) return inflight;
    const p: Promise<void> = (async () => {
      try {
        await engine.tick(now());
      } catch (e) {
        const msg = e instanceof Error ? e.message : "bilinmeyen";
        process.stderr.write(`[automation-scheduler] tick hatası: ${redactString(msg).slice(0, 150)}
`);
      }
    })().finally(() => {
      if (inflight === p) inflight = null;
    });
    inflight = p;
    return p;
  };

  const timer = setInterval(() => {
    if (!stopped) void runTick();
  }, intervalMs);
  timer.unref();

  return {
    get running() {
      return !stopped;
    },
    tickNow: () => (stopped ? Promise.resolve() : runTick()),
    async stop() {
      stopped = true;
      clearInterval(timer);
      if (inflight) await inflight;
    },
  };
}
