// Bilgi yarı ömrü haritası (madde 66). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Bellek kayıtlarının tür ve kapsam başına yaşını, bayatlık payını ve GÖZLENEN yarı ömrünü hesaplar. SALT OKUNUR: hiçbir şey yazmaz, ayar değiştirmez;
// "ayar önerisi" yalnız metindir. Model/ağ/dosya yok. En yeni 500 kayıt okunur (MemoryStore.list sınırı).
// Yarı ömür: bir kaydın ömrü = onun yerine geçen kaydın oluşturulma anı − kendi oluşturulma anı (supersedes_id zinciri). Hâlâ etkin kayıtlar
// SAĞDAN KIRPILMIŞ (henüz bitmemiş) gözlem sayılır ve Kaplan-Meier ile hesaba katılır: yalnız bitenlerin medyanı alınırsa yarı ömür olduğundan kısa çıkar.
// Yarı ömür = hayatta kalma eğrisinin ilk kez ≤ 0,5 olduğu gün. Eğri 0,5'in altına inmiyorsa "tahmin edilemedi".
// EMEKLİ (retired) kayıtların emekliye ayrıldığı an kayıtlı olmadığından ömür hesabına KATILMAZ (sayısı ayrıca bildirilir).
// Örnek boyutu (ömrü gözlenen kayıt sayısı) ≥ 5 değilse tahmin YAPILMAZ: "yetersiz veri".
import { MEMORY_KINDS, STALE_AFTER_DAYS } from "./store.ts";
import type { MemoryKind, MemoryRecord, MemoryStore } from "./store.ts";

export const MIN_LIFETIMES = 5;
export const MAX_GROUPS = 200;
const DAY = 86_400_000;

export interface HalfLifeGroup {
  kind: MemoryKind;
  // null: o türün bütün kapsamları.
  scope: string | null;
  records: number;
  activeRecords: number;
  medianAgeDays: number | null;
  staleCount: number;
  expiredCount: number;
  // (bayat + süresi dolmuş) / etkin kayıt; etkin kayıt yoksa null.
  staleOrExpiredShare: number | null;
  // Ömrü gözlenen (yerine geçilmiş) kayıt sayısı = tahminin örnek boyutu.
  sampleSize: number;
  censored: number;
  retiredUnknownTime: number;
  status: "yeterli" | "yetersiz veri" | "tahmin edilemedi";
  halfLifeDays: number | null;
  defaultStaleAfterDays: number;
  adviceText: string;
}

export interface HalfLifeMap {
  generatedAt: string;
  recordsRead: number;
  // Bozuk ya da ≤ 0 süreli olduğu için ömür hesabından çıkarılan kayıt sayısı.
  excludedBadTimes: number;
  readLimitReached: boolean;
  minSample: number;
  byKind: HalfLifeGroup[];
  byKindAndScope: HalfLifeGroup[];
  truncatedGroups: boolean;
  note: string;
}

export interface HalfLifeSource {
  store: MemoryStore;
  now?: () => Date;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
}

const r1 = (x: number): number => Math.round(x * 10) / 10;

// Kaplan-Meier: ilk ≤ 0,5 olan gün (aynı günde olaylar önce işlenir).
export function kaplanMeierHalfLife(obs: ReadonlyArray<{ t: number; event: boolean }>): number | null {
  // Bozuk (sonlu olmayan) ya da ≤ 0 süreli gözlemler baştan atılır: NaN sonsuz döngü üretir, 0/negatif süre anlamsızdır.
  const sorted = obs.filter((o) => Number.isFinite(o.t) && o.t > 0).sort((a, b) => a.t - b.t || Number(b.event) - Number(a.event));
  let atRisk = sorted.length;
  let s = 1;
  for (let i = 0; i < sorted.length; ) {
    const t = (sorted[i] as { t: number }).t;
    let d = 0;
    let c = 0;
    while (i < sorted.length && (sorted[i] as { t: number }).t === t) {
      if ((sorted[i] as { event: boolean }).event) d++;
      else c++;
      i++;
    }
    if (d > 0 && atRisk > 0) {
      s *= 1 - d / atRisk;
      if (s <= 0.5 + 1e-12) return t;
    }
    atRisk -= d + c;
  }
  return null;
}

interface Item {
  rec: MemoryRecord;
  flags: string[];
  // Ömrü gözlenen (olay) ya da sağdan kırpılmış gözlem; ikisi de değilse null (emekli / sonu bilinmeyen).
  obs: { t: number; event: boolean } | null;
  retiredUnknown: boolean;
}

function groupOf(kind: MemoryKind, scope: string | null, items: Item[]): HalfLifeGroup {
  const active = items.filter((i) => i.rec.status === "active");
  const stale = active.filter((i) => i.flags.includes("stale")).length;
  const expired = active.filter((i) => i.flags.includes("expired")).length;
  const events = items.filter((i) => i.obs?.event === true).length;
  const censored = items.filter((i) => i.obs !== null && !i.obs.event).length;
  const def = STALE_AFTER_DAYS[kind];
  let status: HalfLifeGroup["status"] = "yetersiz veri";
  let half: number | null = null;
  let advice = `Ayar önerisi yok: ömrü gözlenen kayıt sayısı ${events}, en az ${MIN_LIFETIMES} gerekir (yetersiz veri).`;
  if (events >= MIN_LIFETIMES) {
    half = kaplanMeierHalfLife(items.flatMap((i) => (i.obs ? [i.obs] : [])));
    if (half === null) {
      status = "tahmin edilemedi";
      advice = `Kayıtların yarısından çoğu hâlâ geçerli: yarı ömür tahmin edilemedi (örnek ${events}). Varsayılan bayatlık eşiği ${def} gün; değiştirmek için kanıt yok.`;
    } else {
      status = "yeterli";
      half = r1(half);
      if (half > 0 && def / half > 2) advice = `Varsayılan bayatlık eşiği (${def} gün), gözlenen yarı ömrün (${half} gün) 2 katından uzun: kayıtlar eşikten çok önce değişiyor olabilir; eşiği kısaltmayı düşünün (örnek ${events}). Yalnız bilgi.`;
      else if (half > 0 && def / half < 0.5) advice = `Varsayılan bayatlık eşiği (${def} gün), gözlenen yarı ömrün (${half} gün) yarısından kısa: gereksiz bayat bayrağı üretiyor olabilir; eşiği uzatmayı düşünün (örnek ${events}). Yalnız bilgi.`;
      else advice = `Varsayılan bayatlık eşiği (${def} gün) gözlenen yarı ömürle (${half} gün) uyumlu (örnek ${events}). Değişiklik gerekmiyor.`;
    }
  }
  return {
    kind,
    scope,
    records: items.length,
    activeRecords: active.length,
    // withAge doldurur.
    medianAgeDays: null,
    staleCount: stale,
    expiredCount: expired,
    staleOrExpiredShare: active.length ? Math.round(((stale + expired) / active.length) * 1000) / 1000 : null,
    sampleSize: events,
    censored,
    retiredUnknownTime: items.filter((i) => i.retiredUnknown).length,
    status,
    halfLifeDays: half,
    defaultStaleAfterDays: def,
    adviceText: advice,
  };
}

export function halfLifeMap(src: HalfLifeSource): HalfLifeMap {
  const at = (src.now ?? (() => new Date()))();
  const nowMs = at.getTime();
  const all = src.store.list({ limit: 500 });
  const successorOf = new Map<string, MemoryRecord>();
  for (const r of all) if (r.supersedesId !== null) successorOf.set(r.supersedesId, r);
  let excluded = 0;
  const items: Item[] = all.map((rec) => {
    const flags = src.store.flagsFor(rec, at);
    let obs: Item["obs"] = null;
    if (rec.status === "active") obs = { t: (nowMs - Date.parse(rec.createdAt)) / DAY, event: false };
    else if (rec.status === "superseded") {
      const next = successorOf.get(rec.id);
      if (next) obs = { t: (Date.parse(next.createdAt) - Date.parse(rec.createdAt)) / DAY, event: true };
    }
    if (obs !== null && !(Number.isFinite(obs.t) && obs.t > 0)) {
      excluded++;
      obs = null;
    }
    return { rec, flags, obs, retiredUnknown: rec.status === "retired" };
  });

  const withAge = (g: HalfLifeGroup, group: Item[]): HalfLifeGroup => {
    const ages = group.filter((i) => i.rec.status === "active").map((i) => (nowMs - Date.parse(i.rec.observedAt)) / DAY).filter((x) => Number.isFinite(x));
    const m = median(ages);
    return { ...g, medianAgeDays: m === null ? null : r1(Math.max(0, m)) };
  };

  const byKind = MEMORY_KINDS.map((k) => {
    const g = items.filter((i) => i.rec.kind === k);
    return withAge(groupOf(k, null, g), g);
  });
  const keys = new Map<string, Item[]>();
  for (const i of items) {
    const key = `${i.rec.kind}\u0000${i.rec.scope}`;
    const list = keys.get(key);
    if (list) list.push(i);
    else keys.set(key, [i]);
  }
  const ordered = [...keys.entries()].sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const byKindAndScope = ordered.slice(0, MAX_GROUPS).map(([key, g]) => {
    const [kind, scope] = key.split("\u0000") as [MemoryKind, string];
    return withAge(groupOf(kind, scope, g), g);
  });

  return {
    generatedAt: at.toISOString(),
    recordsRead: all.length,
    excludedBadTimes: excluded,
    readLimitReached: all.length >= 500,
    minSample: MIN_LIFETIMES,
    byKind,
    byKindAndScope,
    truncatedGroups: ordered.length > MAX_GROUPS,
    note: `Yalnız BİLGİDİR: hiçbir ayar değişmez. Ömür = yerine geçen kaydın oluşturulma anı − kendi oluşturulma anı; etkin kayıtlar sağdan kırpılmış sayılır (Kaplan-Meier). Emekli kayıtların emekliye ayrıldığı an kayıtlı olmadığı için hesaba katılmaz. Örnek boyutu ${MIN_LIFETIMES}'ten küçükse tahmin yapılmaz. En yeni 500 kayıt okunur.`,
  };
}
