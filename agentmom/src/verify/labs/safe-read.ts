// Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Doğrulama laboratuvarları (a11y, lineage) için ortak güvenli dosya okuyucu: yol çalışma ağacı İÇİNDE kalmalı (resolveInsideRoot: sembolik bağ/kavşak yok),
// dosya düzenli olmalı, tek sabit bağlı olmalı ve sınırı aşmamalı. Hata iletileri SABİTTİR (dosya içeriği ya da yol sızdırılmaz).
import { closeSync, fstatSync, openSync, readSync, realpathSync } from "node:fs";
import { isAbsolute, relative } from "node:path";
import { resolveInsideRoot } from "../../core/config/safe-path.ts";

export type SafeReadFailure = "outside" | "missing" | "not_file" | "hard_link" | "too_large" | "unreadable";
export type SafeRead = { ok: true; buf: Buffer } | { ok: false; reason: SafeReadFailure; message: string };

const MESSAGES: Record<SafeReadFailure, string> = {
  outside: "the file path is outside the workspace or goes through a symlink",
  missing: "the file does not exist or cannot be opened",
  not_file: "the path is not a regular file",
  hard_link: "the file is hard-linked; refusing to read it",
  too_large: "the file is larger than the allowed size",
  unreadable: "the file could not be read",
};

const fail = (reason: SafeReadFailure, maxBytes?: number): SafeRead => ({ ok: false, reason, message: reason === "too_large" && maxBytes !== undefined ? `the file is larger than ${Math.round(maxBytes / 1024)} KB` : MESSAGES[reason] });

// verifyReal (isteğe bağlı): dosya AÇILDIKTAN sonra gerçek yol için yinelenen denetim (kontrol-kullanım yarışı); false ise "outside".
export function readFileInside(root: string, rel: string, maxBytes: number, verifyReal?: (real: string) => boolean): SafeRead {
  // `:` göreli yolda yasak: NTFS alternatif veri akışı (a.html:s.css) ve sürücü harfi ile çalışma ağacı denetimi atlatılamaz.
  if (rel.includes(":")) return fail("outside");
  let path: string;
  try {
    path = resolveInsideRoot(root, rel);
  } catch {
    return fail("outside");
  }
  let fd: number;
  try {
    fd = openSync(path, "r");
  } catch {
    return fail("missing");
  }
  try {
    // Açıldıktan sonra gerçek konum yeniden doğrulanır (denetim ile açma arasında yol değiştirilmiş olamaz).
    try {
      const real = realpathSync.native(path);
      const realRoot = realpathSync.native(root);
      const rel2 = relative(realRoot, real);
      if (rel2.startsWith("..") || isAbsolute(rel2)) return fail("outside");
      if (verifyReal && !verifyReal(real)) return fail("outside");
    } catch {
      return fail("unreadable");
    }
    const st = fstatSync(fd);
    if (!st.isFile()) return fail("not_file");
    if (st.nlink > 1) return fail("hard_link");
    if (st.size > maxBytes) return fail("too_large", maxBytes);
    const buf = Buffer.alloc(Math.min(st.size, maxBytes) + 1);
    let n = 0;
    while (n < buf.length) {
      const r = readSync(fd, buf, n, buf.length - n, null);
      if (r === 0) break;
      n += r;
    }
    // Okuma sırasında büyüdüyse (yarış) sınırı aşan kısım yok sayılmaz, reddedilir.
    if (n > maxBytes || n > st.size) return fail("too_large", maxBytes);
    return { ok: true, buf: buf.subarray(0, n) };
  } catch {
    return fail("unreadable");
  } finally {
    closeSync(fd);
  }
}
