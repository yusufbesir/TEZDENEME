// Sahip: Claude [İP:AgentMom madde 52]; yalnız yazan yapay zeka değiştirir.
// Görsel regresyon tabanlarının GÜVENİLİR deposu: <evidenceRoot>/baselines/<görev kimliği>/<ad>.png. Buraya yalnız sunucunun onay ucu yazar
// (POST /api/tasks/:id/baselines/approve, yalnız kullanıcı); uygulayıcı ajanın yazabildiği çalışma ağacından asla okunup güvenilmez.
// Onay, bir tabanı SİLMEZ ya da kaybettirmez: var olan taban önce history/<sha256>-<ad> olarak saklanır, sonra yenisi atomik olarak yerine geçer.
import { closeSync, copyFileSync, existsSync, fstatSync, lstatSync, mkdirSync, openSync, readSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join, sep } from "node:path";
import { resolveInsideRoot } from "../core/config/safe-path.ts";
import { sha256Of } from "./evidence-files.ts";
import { isBaselineName } from "./scenario.ts";

export const MAX_BASELINE_BYTES = 8 * 1024 * 1024;
const PNG_SIGNATURE = "89504e470d0a1a0a";
const TASK_ID_RE = /^[0-9a-f-]{36}$/;

export class BaselineError extends Error {
  readonly code: "invalid_name" | "invalid_source" | "hash_mismatch" | "unavailable";

  constructor(code: BaselineError["code"], message: string) {
    super(message);
    this.name = "BaselineError";
    this.code = code;
  }
}

export function baselineDirFor(evidenceRoot: string, taskId: string): string {
  if (!TASK_ID_RE.test(taskId)) throw new BaselineError("invalid_name", "task id is not a uuid");
  return join(evidenceRoot, "baselines", taskId);
}

// Kaynak görüntüyü DÜZENLİ dosya olarak, bağ izlemeden, boyut sınırıyla okur ve PNG imzasını denetler.
function readPng(path: string): Buffer {
  const fd = openSync(path, "r");
  try {
    const st = fstatSync(fd);
    if (!st.isFile() || st.nlink > 1) throw new BaselineError("invalid_source", "the new image is not a plain file");
    if (st.size === 0 || st.size > MAX_BASELINE_BYTES) throw new BaselineError("invalid_source", `the new image must be 1 to ${MAX_BASELINE_BYTES} bytes`);
    const buf = Buffer.alloc(st.size);
    let n = 0;
    while (n < buf.length) {
      const r = readSync(fd, buf, n, buf.length - n, null);
      if (r === 0) break;
      n += r;
    }
    if (n !== buf.length) throw new BaselineError("invalid_source", "the new image changed while it was read");
    if (buf.subarray(0, 8).toString("hex") !== PNG_SIGNATURE) throw new BaselineError("invalid_source", "the new image is not a PNG");
    return buf;
  } finally {
    closeSync(fd);
  }
}

export interface ApprovedBaseline {
  name: string;
  path: string;
  sha256: string;
  bytes: number;
  replaced: boolean;
  previousSha256: string | null;
}

// sourcePath: önceki koşunun yeni görüntü kanıtı (kanıt klasörünün İÇİNDE olmalı); expectedSha256: koşu kaydındaki özet (dosya değiştirilmişse onay reddedilir).
export function approveBaseline(opts: { evidenceRoot: string; taskId: string; name: string; sourcePath: string; expectedSha256: string }): ApprovedBaseline {
  if (!isBaselineName(opts.name)) throw new BaselineError("invalid_name", "invalid baseline name");
  let root: string;
  try {
    root = realpathSync(opts.evidenceRoot);
    const real = realpathSync(opts.sourcePath);
    if (!real.startsWith(root + sep) || lstatSync(opts.sourcePath).isSymbolicLink()) throw new BaselineError("invalid_source", "the new image is outside the evidence folder");
  } catch (err) {
    if (err instanceof BaselineError) throw err;
    throw new BaselineError("unavailable", "the new image file is not available");
  }
  const png = readPng(opts.sourcePath);
  const sha = sha256Of(png);
  if (sha !== opts.expectedSha256) throw new BaselineError("hash_mismatch", "the new image no longer matches the recorded hash; refusing to approve");
  const dir = resolveInsideRoot(opts.evidenceRoot, join("baselines", opts.taskId));
  mkdirSync(join(dir, "history"), { recursive: true });
  const dest = join(dir, opts.name);
  let previousSha256: string | null = null;
  if (existsSync(dest)) {
    // Önceki onaylı taban kaybolmaz: özetiyle adlandırılarak history/ altına KOPYALANIR (zaten varsa dokunulmaz), sonra yenisi yerine geçer.
    const old = readPng(dest);
    previousSha256 = sha256Of(old);
    const keep = join(dir, "history", `${previousSha256}-${opts.name}`);
    if (!existsSync(keep)) copyFileSync(dest, keep, 1 /* COPYFILE_EXCL */);
  }
  const tmp = join(dir, `.tmp-${randomUUID()}`);
  writeFileSync(tmp, png, { flag: "wx" });
  renameSync(tmp, dest);
  return { name: opts.name, path: dest, sha256: sha, bytes: png.length, replaced: previousSha256 !== null, previousSha256 };
}
