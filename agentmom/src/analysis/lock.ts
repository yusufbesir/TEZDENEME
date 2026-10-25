// Analiz taramaları için tekil kilit (D8b). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Aynı anda en çok BİR depo taraması çalışır; meşgulken yeni istek BUSY alır (uç 429 {code:"busy"} döner). Böylece art arda istekler olay döngüsünü ve belleği yığmaz.
let running = false;

export const BUSY = Symbol("busy");

export async function exclusiveScan<T>(fn: () => Promise<T>): Promise<T | typeof BUSY> {
  if (running) return BUSY;
  running = true;
  try {
    return await fn();
  } finally {
    running = false;
  }
}
