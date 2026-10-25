// Sol menü ve kullanıcı menüsü saf mantık + güvenlik taraması testleri. Sahip: Claude [IP:AgentMom Faz 11 / sidebar].
// Kaynak dosyalar node:vm ile sahte window içinde yüklenir (DOM'a dokunulmaz).
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const dir = import.meta.dirname as string;
const read = (f: string): string => fs.readFileSync(path.join(dir, f), "utf8");

function load(file: string, extra: Record<string, unknown> = {}): any {
  const win: any = { ...extra };
  const ctx = vm.createContext({ window: win, console });
  vm.runInContext(read(file), ctx, { filename: file });
  return win;
}

const sb = load("sidebar.js").AM_SIDEBAR;
const um = load("usermenu.js").AM_USERMENU;
const J = (x: unknown): unknown => JSON.parse(JSON.stringify(x));
const deq = (a: unknown, b: unknown, m?: string): void => assert.deepEqual(J(a), J(b), m);
const P = sb.pure;
const U = um.pure;

test("modüller DOM'a dokunmadan yüklenir ve sözleşme API'sini sunar", () => {
  assert.equal(typeof sb.init, "function");
  assert.equal(typeof sb.render, "function");
  assert.equal(typeof um.init, "function");
  assert.equal(typeof um.render, "function");
  assert.ok(P && U);
});

test("statusInfo: altı durum ayrı şekil+etiket, bilinmeyen durum okunur", () => {
  const shapes = ["idle", "running", "awaiting_approval", "done", "failed", "unavailable"].map((s) => P.statusInfo(s).shape);
  assert.equal(new Set(shapes).size, 6, "her durumun şekli farklı (renk tek ipucu değil)");
  assert.equal(P.statusInfo("running").cls, "am-sb-dot--running");
  assert.equal(P.statusInfo("???").shape, "unknown");
  assert.equal(P.statusInfo(undefined).shape, "unknown");
  assert.equal(P.statusInfo("__proto__").shape, "unknown");
});

test("modelBadge: Haiku/Sonnet/Opus, sağlayıcı kısa adı, bilinmeyen = ?", () => {
  assert.equal(P.modelBadge("claude-opus-4-1", "anthropic").text, "Opus");
  assert.equal(P.modelBadge("claude-3-5-sonnet", "anthropic").text, "Sonnet");
  assert.equal(P.modelBadge("HAIKU", "").text, "Haiku");
  assert.equal(P.modelBadge("unknown", "anthropic").text, "?");
  assert.equal(P.modelBadge("", "x").text, "?");
  assert.equal(P.modelBadge(null, null).known, false);
  const o = P.modelBadge("gpt-5-turbo", "openai");
  assert.equal(o.text, "Openai");
  assert.equal(o.known, true);
  assert.equal(o.family, null);
});

test("mismatchText: ad OPUS iken gerçek model Sonnet ise uyarı metni", () => {
  assert.equal(P.mismatchText("OPUS kıdemli", "claude-sonnet-4"), "Ad: OPUS, gerçek model: Sonnet");
  assert.equal(P.mismatchText("opus yardımcı", "claude-opus-4"), null);
  assert.equal(P.mismatchText("Genel yardımcı", "claude-haiku-3"), null, "ad model söylemiyorsa uyarı yok");
  assert.equal(P.mismatchText("Opus", "unknown"), null, "model bilinmiyorsa karşılaştırılamaz");
  assert.equal(P.mismatchText("haiku hızlı", "gpt-5"), "Ad: HAIKU, gerçek model: gpt-5");
});

test("mismatchText: AM_NAME.modelMismatch varsa onun kararı esas alınır", () => {
  const w = load("sidebar.js", { AM_NAME: { modelMismatch: () => "özel uyarı" } }).AM_SIDEBAR.pure;
  assert.equal(w.mismatchText("x", "y"), "özel uyarı");
  const w2 = load("sidebar.js", { AM_NAME: { modelMismatch: () => false } }).AM_SIDEBAR.pure;
  assert.equal(w2.mismatchText("OPUS", "sonnet"), null);
  const w3 = load("sidebar.js", { AM_NAME: { modelMismatch: () => ({ text: "nesne metni" }) } }).AM_SIDEBAR.pure;
  assert.equal(w3.mismatchText("OPUS", "sonnet"), "nesne metni");
});

test("cleanName: kontrol ve çift yönlü karakterleri temizler, 60 ile keser", () => {
  assert.equal(P.cleanName("  a\u0000b‮c  "), "a b c");
  assert.equal(P.cleanName("x".repeat(100)).length, 60);
  assert.equal(P.cleanName(null), "");
  const w = load("sidebar.js", { AM_NAME: { clean: (s: string) => "T:" + s } }).AM_SIDEBAR.pure;
  assert.equal(w.cleanName("ab"), "T:ab");
});

test("orderSubs: sıra yalnız görsel, arşivlenmişler dışarıda, sırasızlar sona", () => {
  const subs = [{ id: "a" }, { id: "b" }, { id: "c", archived: true }, { id: "d" }];
  deq(P.orderSubs(subs, []).map((s: any) => s.id), ["a", "b", "d"]);
  deq(P.orderSubs(subs, ["d", "a"]).map((s: any) => s.id), ["d", "a", "b"]);
  deq(P.orderSubs(null, null), []);
  assert.equal(subs.length, 4, "girdi değişmez");
});

test("splitPinned, reorder, moveInOrder", () => {
  const sp = P.splitPinned([{ id: 1, pinned: true }, { id: 2 }, { id: 3, pinned: true }]);
  assert.equal(sp.pinned.length, 2);
  assert.equal(sp.others.length, 1);
  deq(P.reorder(["a", "b", "c"], "a", "c"), ["b", "c", "a"]);
  deq(P.reorder(["a", "b", "c"], "c", "a"), ["c", "a", "b"]);
  deq(P.reorder(["a", "b"], "x", "a"), ["a", "b"]);
  deq(P.moveInOrder(["a", "b", "c"], "b", -1), ["b", "a", "c"]);
  deq(P.moveInOrder(["a", "b", "c"], "a", -1), ["a", "b", "c"], "uçta sabit");
  deq(P.moveInOrder(["a", "b", "c"], "c", 1), ["a", "b", "c"]);
});

test("groupTopics: arşivsizler, en yeni üstte; proje önce, Bu bilgisayar sonda", () => {
  const topics = [
    { id: 1, title: "eski", updatedAt: "2026-10-01T00:00:00Z", group: "" },
    { id: 2, title: "yeni", updatedAt: "2026-10-20T00:00:00Z", group: "" },
    { id: 3, title: "gizli", updatedAt: "2026-10-21T00:00:00Z", archived: true },
    { id: 4, title: "yerel", updatedAt: 5, group: "local" },
    { id: 5, title: "klasör", updatedAt: 9, group: "Zeta klasörü" }
  ];
  const g = P.groupTopics(topics);
  deq(g.map((x: any) => x.kind), ["project", "named", "local"]);
  deq(g[0].items.map((t: any) => t.id), [2, 1]);
  assert.equal(g[1].key, "Zeta klasörü");
  assert.equal(P.groupTopics([]).length, 0);
});

test("limitItems: ilk 6 + Daha fazla", () => {
  const ten = Array.from({ length: 10 }, (_, i) => i);
  const a = P.limitItems(ten, 6, false);
  assert.equal(a.shown.length, 6);
  assert.equal(a.hidden, 4);
  const b = P.limitItems(ten, 6, true);
  assert.equal(b.shown.length, 10);
  assert.equal(b.hidden, 0);
  assert.equal(P.limitItems([1, 2], 6, false).hidden, 0);
});

test("navIndex: ok tuşu gezintisi sarmalar, Home/End, boş liste", () => {
  assert.equal(P.navIndex(0, 3, "ArrowDown"), 1);
  assert.equal(P.navIndex(2, 3, "ArrowDown"), 0);
  assert.equal(P.navIndex(0, 3, "ArrowUp"), 2);
  assert.equal(P.navIndex(-1, 3, "ArrowDown"), 0);
  assert.equal(P.navIndex(-1, 3, "ArrowUp"), 2);
  assert.equal(P.navIndex(1, 3, "Home"), 0);
  assert.equal(P.navIndex(1, 3, "End"), 2);
  assert.equal(P.navIndex(1, 0, "ArrowDown"), -1);
  assert.equal(P.navIndex(1, 3, "a"), 1);
  assert.equal(U.navIndex(2, 4, "ArrowDown"), 3);
});

test("projectState, matches, nextTheme, updateReady, countOpen", () => {
  assert.equal(P.projectState([{ state: "idle" }, { state: "running" }]), "running");
  assert.equal(P.projectState([{ state: "running" }, { state: "awaiting_approval" }]), "awaiting_approval");
  assert.equal(P.projectState([{ state: "running", archived: true }]), "idle");
  assert.equal(P.matches("Işık Deneme", "ışık"), true);
  assert.equal(P.matches("abc", ""), true);
  assert.equal(P.matches("abc", "zzz"), false);
  assert.equal(P.nextTheme("system"), "dark");
  assert.equal(P.nextTheme("dark"), "light");
  assert.equal(P.nextTheme("light"), "system");
  assert.equal(P.nextTheme("bozuk"), "dark");
  assert.equal(P.updateReady({ ready: true }), true);
  assert.equal(P.updateReady({ ready: "evet" }), false, "uydurma yok: yalnız ready===true");
  assert.equal(P.updateReady(undefined), false);
  assert.equal(P.updateReady(null), false);
  assert.equal(P.countOpen([{ id: 1 }, { id: 2, archived: true }]), 1);
});

test("sidebar metinleri sidebar. önekli ve AM_REGISTER_TR ile kaydolur", () => {
  const reg: Record<string, Record<string, string>> = {};
  load("sidebar.js", { AM_REGISTER_TR: (mod: string, tr: Record<string, string>) => { reg[mod] = tr; } });
  load("usermenu.js", { AM_REGISTER_TR: (mod: string, tr: Record<string, string>) => { reg[mod] = tr; } });
  assert.ok(reg.sidebar && reg.usermenu);
  for (const k of Object.keys(reg.sidebar as object)) assert.ok(k.startsWith("sidebar."), k);
  for (const k of Object.keys(reg.usermenu as object)) assert.ok(k.startsWith("usermenu."), k);
});

test("kullanıcı menüsü: gerekli öğeler var, eylemler sözleşmeye bağlı", () => {
  const ids = U.items("main").map((i: any) => i.id);
  for (const id of ["settings", "usage", "language", "help", "changelog", "about", "backup", "quit"]) assert.ok(ids.includes(id), id);
  deq(U.plan("main", "settings"), { kind: "action", action: "openSettings", args: ["general"] });
  deq(U.plan("main", "usage"), { kind: "action", action: "openProjectSettings", args: ["usage"] });
  deq(U.plan("main", "help"), { kind: "action", action: "openSettings", args: ["help"] });
  assert.equal(U.plan("main", "about").kind, "sub");
  assert.equal(U.plan("main", "yok"), null);
  assert.equal(U.items("about").length, 6);
  for (const it of U.ABOUT) assert.equal(U.plan("about", it.id).action, "openSettings");
});

test("kullanıcı menüsü: kapatma onay ister (AM_DIALOG.confirm), kalıcı silme/anahtar/plan öğesi yok", () => {
  const q = U.plan("main", "quit");
  assert.equal(q.kind, "confirm");
  assert.equal(q.action, "quitApp");
  const o = U.confirmOptions();
  assert.ok(o.title && o.action && o.target && o.confirmLabel && o.danger === true);
  const all = [...U.MAIN, ...U.ABOUT].filter((i: any) => !i.sep);
  const labels = all.map((i: any) => U.TR[i.key] + " " + (i.valueKey ? U.TR[i.valueKey] : "")).join(" | ").toLowerCase();
  for (const bad of ["api", "anahtar", "plan", "fatura", "mağaza", "e-posta", "@", "sil"]) assert.ok(!labels.includes(bad), bad);
  assert.ok(!Object.values(U.TR).some((v: any) => /@|api/i.test(String(v))));
});

test("kaynak taraması: yasak API, satır içi stil ve dış kaynak yok", () => {
  const forbidden = [
    /innerHTML/, /outerHTML/, /insertAdjacentHTML/, /document\.write/, /\beval\s*\(/, /new Function/, /srcdoc/, /postMessage/,
    /document\.cookie/, /localStorage/, /sessionStorage/, /\bfetch\s*\(/, /XMLHttpRequest/, /setTimeout\s*\(\s*["']/,
    /\bon(click|load|error|input|change)\s*=/, /<script/i, /<style/i, /javascript:/i, /https?:\/\//
  ];
  for (const f of ["sidebar.js", "usermenu.js"]) {
    const src = read(f).replace(/^\/\/.*$/gm, "");
    for (const re of forbidden) assert.ok(!re.test(src), `${f} içinde yasak: ${re}`);
    assert.ok(!/\.style\b|setAttribute\(\s*["']style/.test(src), `${f} satır içi stil kullanmaz`);
  }
  for (const f of ["sidebar.css", "menu.css"]) {
    const stripped = read(f).replace(/\/\*[\s\S]*?\*\//g, "");
    assert.ok(!/url\s*\(/i.test(stripped) && !/@import/i.test(stripped) && !/https?:\/\//i.test(stripped), `${f} dış kaynak yok`);
    assert.ok(!/style\s*=/i.test(stripped), `${f} satır içi stil yok`);
    assert.ok(!/(^|[^-\w])#[0-9a-fA-F]{3,8}\s*[;}]/.test(stripped), `${f} sabit renk kullanmaz (yalnız var(--am-*))`);
  }
});

test("güvenlik: yeniden adlandırma yalnız güvenilir olaydan, silme yok", () => {
  const src = read("sidebar.js");
  assert.ok(/isTrusted/.test(src), "isTrusted denetimi var");
  assert.ok(/renameSubsession/.test(src));
  assert.ok(!/deleteSubsession|removeSubsession|\bdelete\s+AM|permanent/i.test(src), "silme eylemi yok");
  assert.ok(/archiveSubsession/.test(src));
});

test("render: ana API hatasız boş girdiyle de import edilebilir (host yokken no-op)", () => {
  assert.doesNotThrow(() => sb.render(undefined));
  assert.doesNotThrow(() => um.render(undefined));
  assert.equal(um.isOpen(), false);
});

test("gezinme (§14): Yeni + 13 yönetim sayfası, her birinin metni var; sayfa kimlikleri benzersiz", () => {
  const ids = P.navPageIds();
  assert.equal(ids.length, 13);
  assert.equal(new Set(ids).size, 13);
  assert.deepEqual(J(ids.slice(0, 3)), ["overview", "projects", "tasks"]);
  assert.deepEqual(J(P.NAV_TOP.map((n: any) => n.id)), ["new"]);
  for (const n of P.NAV_PAGES) assert.ok(P.TR[n.key] && !P.TR[n.key].startsWith("⟦"), n.id);
  assert.equal(P.TR["sidebar.manage"], "Yönetim");
});

test("gezinme: tıklama AM.actions.navigate(<sayfa kimliği>) çağırır ve kaynakta aria-current/aria-expanded var", () => {
  const src = read("sidebar.js");
  assert.match(src, /act\("navigate", n\.id\)/);
  assert.match(src, /aria-current/);
  assert.match(src, /aria-expanded/);
  assert.match(src, /aria-controls/);
  const css = read("sidebar.css");
  assert.match(css, /am-sb--collapsed \.am-sb-navlist\[hidden\]/, "daraltılmış kipte simgeler her zaman görünür");
});
