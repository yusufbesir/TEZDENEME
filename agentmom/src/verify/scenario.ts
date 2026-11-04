// Declarative browser scenario: data, not code. A model or a task contract can describe checks, but cannot run arbitrary scripts in the browser.
export type ScenarioStep =
  | { kind: "goto"; path: string }
  | { kind: "click"; selector: string }
  | { kind: "fill"; selector: string; value: string }
  | { kind: "expectText"; selector: string; text: string; name: string; criteria?: string[] }
  | { kind: "expectVisible"; selector: string; name: string; criteria?: string[] }
  | { kind: "screenshot"; name: string }
  // Genel tarayıcı otomasyonu (madde 18): hepsi bildirimsel veridir; seçiciler yalnız metin olarak Playwright'a verilir, JS ifadesi/evaluate yoktur.
  | { kind: "select"; selector: string; value: string }
  | { kind: "press"; key: PressKey }
  | { kind: "check"; selector: string; checked?: boolean }
  | { kind: "waitForVisible"; selector: string; timeoutMs?: number }
  | { kind: "expectUrl"; path: string; name?: string; criteria?: string[] }
  | { kind: "expectCount"; selector: string; name: string; count?: number; min?: number; max?: number; criteria?: string[] }
  | { kind: "expectAttribute"; selector: string; attribute: string; value: string; name: string; criteria?: string[] }
  | { kind: "expectNotVisible"; selector: string; name: string; criteria?: string[] }
  | { kind: "back" }
  | { kind: "reload" }
  | { kind: "focus"; selector: string }
  | { kind: "expectFocused"; selector: string; name: string; criteria?: string[] }
  // Yalnız sayfanın KENDİ kaynağından gelen konsol hataları ve yakalanmamış sayfa hataları sayılır (bir önceki denetimden bu yana).
  | { kind: "expectNoConsoleErrors"; name: string; criteria?: string[] }
  // Görsel regresyon (madde 52): taban YALNIZ kullanıcı onayıyla oluşur; taban yoksa test "skipped" olur (bkz. browser.ts / browser-worker.ts).
  | { kind: "expectScreenshotMatch"; name: string; baseline: string; maxDiffRatio?: number; viewport?: VisualViewport; selector?: string; criteria?: string[] }
  // Görsel kalite kapısı (madde 51): her görünüm alanı x kural bir test sonucu olur. Kurallar ölçülebilirdir (bkz. visual-probe.ts); estetik/piksel yargısı YOKTUR.
  | { kind: "expectVisualQuality"; name: string; viewports?: VisualViewport[]; checks?: VisualCheck[]; criteria?: string[] };

export interface VisualViewport {
  width: number;
  height: number;
}

export const VISUAL_CHECKS = ["overflow", "clipped-text", "font-size", "target-size", "contrast", "overlap", "images"] as const;
export type VisualCheck = (typeof VISUAL_CHECKS)[number];
export const DEFAULT_VIEWPORTS: readonly VisualViewport[] = [{ width: 360, height: 800 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }];
export const MAX_VIEWPORTS = 4;
export const VIEWPORT_MIN = 200;
export const VIEWPORT_MAX = 3000;
// Bir senaryoda tüm expectVisualQuality adımlarının toplam görünüm alanı sayısı (her biri ayrı ölçüm + ekran görüntüsü). viewports verilmeyen adım varsayılan 3 sayılır.
export const MAX_VISUAL_VIEWPORTS_PER_SCENARIO = 8;

export const MAX_STEPS = 60;

// press için izin listesi: serbest klavye girdisi (kısayol, metin yazma) yoktur.
export const PRESS_KEYS = ["Enter", "Escape", "Tab", "Shift+Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"] as const;
export type PressKey = (typeof PRESS_KEYS)[number];
export const MAX_SCREENSHOT_MATCHES = 10;
export const DEFAULT_MAX_DIFF_RATIO = 0.01;
export const MAX_DIFF_RATIO_LIMIT = 0.2;
export const WAIT_TIMEOUT_MIN = 100;
export const WAIT_TIMEOUT_MAX = 30_000;

export class ScenarioError extends Error {}

// Taban dosya adı: tek parça, harf/rakam/._- , .png ile biter, ".." yok (çalışma ağacına ya da kanıt klasörüne göreli ad; yol DEĞİL).
const BASELINE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}\.png$/;
const RESERVED_RE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;
export function isBaselineName(v: unknown): v is string {
  // Windows ayrılmış aygıt adları (CON, PRN, AUX, NUL, COM1-9, LPT1-9; büyük/küçük harf, uzantılı CON.png dahil) dosya adı olamaz.
  return typeof v === "string" && BASELINE_RE.test(v) && !v.includes("..") && !RESERVED_RE.test(v);
}

// Site-göreli yol (goto/expectUrl): "/" ile başlar, "//" ve ".." ve ters bölü yok. "javascript:" gibi şemalar "/" ile başlamadığı için reddedilir.
export function isSitePath(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= 300 && v.startsWith("/") && !v.startsWith("//") && !v.includes("..") && !v.includes("\\") && !/[\u0000-\u001f\u007f]/.test(v);
}

function s(v: unknown, field: string, max: number): string {
  if (typeof v !== "string" || v.length === 0 || v.length > max) throw new ScenarioError(`${field} must be a non-empty string of at most ${max} characters`);
  return v;
}

export function validateScenario(input: unknown): ScenarioStep[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_STEPS) throw new ScenarioError(`scenario must list 1 to ${MAX_STEPS} steps`);
  const out = input.map((raw, i): ScenarioStep => {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new ScenarioError(`step ${i} must be an object`);
    const o = raw as Record<string, unknown>;
    const allowed: Record<string, string[]> = {
      goto: ["kind", "path"],
      click: ["kind", "selector"],
      fill: ["kind", "selector", "value"],
      expectText: ["kind", "selector", "text", "name", "criteria"],
      expectVisible: ["kind", "selector", "name", "criteria"],
      screenshot: ["kind", "name"],
      select: ["kind", "selector", "value"],
      press: ["kind", "key"],
      check: ["kind", "selector", "checked"],
      waitForVisible: ["kind", "selector", "timeoutMs"],
      expectUrl: ["kind", "path", "name", "criteria"],
      expectCount: ["kind", "selector", "name", "count", "min", "max", "criteria"],
      expectAttribute: ["kind", "selector", "attribute", "value", "name", "criteria"],
      expectNotVisible: ["kind", "selector", "name", "criteria"],
      back: ["kind"],
      reload: ["kind"],
      focus: ["kind", "selector"],
      expectFocused: ["kind", "selector", "name", "criteria"],
      expectNoConsoleErrors: ["kind", "name", "criteria"],
      expectScreenshotMatch: ["kind", "name", "baseline", "maxDiffRatio", "viewport", "selector", "criteria"],
      expectVisualQuality: ["kind", "name", "viewports", "checks", "criteria"],
    };
    const keys = typeof o.kind === "string" && Object.hasOwn(allowed, o.kind) ? allowed[o.kind] : undefined;
    if (!keys) throw new ScenarioError(`step ${i}: unknown kind`);
    for (const k of Object.keys(o)) if (!keys.includes(k)) throw new ScenarioError(`step ${i}: unknown field ${k}`);
    const criteria = (): string[] | undefined => {
      if (o.criteria === undefined) return undefined;
      if (!Array.isArray(o.criteria) || o.criteria.length > 10 || !o.criteria.every((c) => typeof c === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(c))) throw new ScenarioError(`step ${i}: criteria must be up to 10 criterion ids`);
      return o.criteria as string[];
    };
    switch (o.kind) {
      case "goto": {
        const path = s(o.path, `step ${i}.path`, 300);
        if (!isSitePath(path)) throw new ScenarioError(`step ${i}: path must be a site-relative path starting with /`);
        return { kind: "goto", path };
      }
      case "select":
        return { kind: "select", selector: s(o.selector, `step ${i}.selector`, 200), value: s(o.value, `step ${i}.value`, 500) };
      case "press": {
        if (typeof o.key !== "string" || !(PRESS_KEYS as readonly string[]).includes(o.key)) throw new ScenarioError(`step ${i}: key must be one of ${PRESS_KEYS.join(", ")}`);
        return { kind: "press", key: o.key as PressKey };
      }
      case "check": {
        if (o.checked !== undefined && typeof o.checked !== "boolean") throw new ScenarioError(`step ${i}: checked must be a boolean`);
        return { kind: "check", selector: s(o.selector, `step ${i}.selector`, 200), ...(o.checked !== undefined ? { checked: o.checked } : {}) };
      }
      case "waitForVisible": {
        if (o.timeoutMs !== undefined && (typeof o.timeoutMs !== "number" || !Number.isInteger(o.timeoutMs) || o.timeoutMs < WAIT_TIMEOUT_MIN || o.timeoutMs > WAIT_TIMEOUT_MAX)) throw new ScenarioError(`step ${i}: timeoutMs must be an integer from ${WAIT_TIMEOUT_MIN} to ${WAIT_TIMEOUT_MAX}`);
        return { kind: "waitForVisible", selector: s(o.selector, `step ${i}.selector`, 200), ...(o.timeoutMs !== undefined ? { timeoutMs: o.timeoutMs as number } : {}) };
      }
      case "expectUrl": {
        const c = criteria();
        const path = s(o.path, `step ${i}.path`, 300);
        if (!isSitePath(path)) throw new ScenarioError(`step ${i}: path must be a site-relative path starting with /`);
        return { kind: "expectUrl", path, ...(o.name !== undefined ? { name: s(o.name, `step ${i}.name`, 200) } : {}), ...(c ? { criteria: c } : {}) };
      }
      case "expectCount": {
        const c = criteria();
        const num = (k: "count" | "min" | "max"): number | undefined => {
          const x = o[k];
          if (x === undefined) return undefined;
          if (typeof x !== "number" || !Number.isInteger(x) || x < 0 || x > 10_000) throw new ScenarioError(`step ${i}: ${k} must be an integer from 0 to 10000`);
          return x;
        };
        const count = num("count");
        const min = num("min");
        const max = num("max");
        if (count === undefined && min === undefined && max === undefined) throw new ScenarioError(`step ${i}: expectCount needs count, min or max`);
        if (count !== undefined && (min !== undefined || max !== undefined)) throw new ScenarioError(`step ${i}: count cannot be combined with min or max`);
        if (min !== undefined && max !== undefined && min > max) throw new ScenarioError(`step ${i}: min must not exceed max`);
        return { kind: "expectCount", selector: s(o.selector, `step ${i}.selector`, 200), name: s(o.name, `step ${i}.name`, 200), ...(count !== undefined ? { count } : {}), ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}), ...(c ? { criteria: c } : {}) };
      }
      case "expectAttribute": {
        const c = criteria();
        if (typeof o.attribute !== "string" || !/^[A-Za-z_:][A-Za-z0-9_:.-]{0,60}$/.test(o.attribute)) throw new ScenarioError(`step ${i}: attribute must be a plain attribute name`);
        if (typeof o.value !== "string" || o.value.length > 500) throw new ScenarioError(`step ${i}: value must be a string of at most 500 characters`);
        return { kind: "expectAttribute", selector: s(o.selector, `step ${i}.selector`, 200), attribute: o.attribute, value: o.value, name: s(o.name, `step ${i}.name`, 200), ...(c ? { criteria: c } : {}) };
      }
      case "expectNotVisible": {
        const c = criteria();
        return { kind: "expectNotVisible", selector: s(o.selector, `step ${i}.selector`, 200), name: s(o.name, `step ${i}.name`, 200), ...(c ? { criteria: c } : {}) };
      }
      case "back":
        return { kind: "back" };
      case "reload":
        return { kind: "reload" };
      case "focus":
        return { kind: "focus", selector: s(o.selector, `step ${i}.selector`, 200) };
      case "expectFocused": {
        const c = criteria();
        return { kind: "expectFocused", selector: s(o.selector, `step ${i}.selector`, 200), name: s(o.name, `step ${i}.name`, 200), ...(c ? { criteria: c } : {}) };
      }
      case "expectNoConsoleErrors": {
        const c = criteria();
        return { kind: "expectNoConsoleErrors", name: s(o.name, `step ${i}.name`, 200), ...(c ? { criteria: c } : {}) };
      }
      case "expectScreenshotMatch": {
        const c = criteria();
        if (!isBaselineName(o.baseline)) throw new ScenarioError(`step ${i}: baseline must be a plain file name ending in .png (letters, digits, . _ - ; no path, no ..)`);
        let maxDiffRatio: number | undefined;
        if (o.maxDiffRatio !== undefined) {
          if (typeof o.maxDiffRatio !== "number" || !Number.isFinite(o.maxDiffRatio) || o.maxDiffRatio < 0 || o.maxDiffRatio > MAX_DIFF_RATIO_LIMIT) throw new ScenarioError(`step ${i}: maxDiffRatio must be a number from 0 to ${MAX_DIFF_RATIO_LIMIT}`);
          maxDiffRatio = o.maxDiffRatio;
        }
        let viewport: VisualViewport | undefined;
        if (o.viewport !== undefined) {
          if (o.viewport === null || typeof o.viewport !== "object" || Array.isArray(o.viewport)) throw new ScenarioError(`step ${i}: viewport must be an object`);
          const v = o.viewport as Record<string, unknown>;
          for (const key of Object.keys(v)) if (key !== "width" && key !== "height") throw new ScenarioError(`step ${i}: viewport: unknown field ${key}`);
          const dim = (x: unknown, what: string): number => {
            if (typeof x !== "number" || !Number.isInteger(x) || x < VIEWPORT_MIN || x > VIEWPORT_MAX) throw new ScenarioError(`step ${i}: viewport.${what} must be an integer from ${VIEWPORT_MIN} to ${VIEWPORT_MAX}`);
            return x;
          };
          viewport = { width: dim(v.width, "width"), height: dim(v.height, "height") };
        }
        return {
          kind: "expectScreenshotMatch",
          name: s(o.name, `step ${i}.name`, 200),
          baseline: o.baseline,
          ...(maxDiffRatio !== undefined ? { maxDiffRatio } : {}),
          ...(viewport ? { viewport } : {}),
          ...(o.selector !== undefined ? { selector: s(o.selector, `step ${i}.selector`, 200) } : {}),
          ...(c ? { criteria: c } : {}),
        };
      }
      case "click":
        return { kind: "click", selector: s(o.selector, `step ${i}.selector`, 200) };
      case "fill":
        return { kind: "fill", selector: s(o.selector, `step ${i}.selector`, 200), value: typeof o.value === "string" && o.value.length <= 500 ? o.value : (() => { throw new ScenarioError(`step ${i}: value must be a string of at most 500 characters`); })() };
      case "expectText": {
        const c = criteria();
        return { kind: "expectText", selector: s(o.selector, `step ${i}.selector`, 200), text: s(o.text, `step ${i}.text`, 500), name: s(o.name, `step ${i}.name`, 200), ...(c ? { criteria: c } : {}) };
      }
      case "expectVisible": {
        const c = criteria();
        return { kind: "expectVisible", selector: s(o.selector, `step ${i}.selector`, 200), name: s(o.name, `step ${i}.name`, 200), ...(c ? { criteria: c } : {}) };
      }
      case "expectVisualQuality": {
        const c = criteria();
        let viewports: VisualViewport[] | undefined;
        if (o.viewports !== undefined) {
          if (!Array.isArray(o.viewports) || o.viewports.length === 0 || o.viewports.length > MAX_VIEWPORTS) throw new ScenarioError(`step ${i}: viewports must list 1 to ${MAX_VIEWPORTS} sizes`);
          viewports = o.viewports.map((vp: unknown, k: number): VisualViewport => {
            if (vp === null || typeof vp !== "object" || Array.isArray(vp)) throw new ScenarioError(`step ${i}: viewports[${k}] must be an object`);
            const v = vp as Record<string, unknown>;
            for (const key of Object.keys(v)) if (key !== "width" && key !== "height") throw new ScenarioError(`step ${i}: viewports[${k}]: unknown field ${key}`);
            const dim = (x: unknown, what: string): number => {
              if (typeof x !== "number" || !Number.isInteger(x) || x < VIEWPORT_MIN || x > VIEWPORT_MAX) throw new ScenarioError(`step ${i}: viewports[${k}].${what} must be an integer from ${VIEWPORT_MIN} to ${VIEWPORT_MAX}`);
              return x;
            };
            return { width: dim(v.width, "width"), height: dim(v.height, "height") };
          });
        }
        let checks: VisualCheck[] | undefined;
        if (o.checks !== undefined) {
          if (!Array.isArray(o.checks) || o.checks.length === 0 || o.checks.length > VISUAL_CHECKS.length || !o.checks.every((x) => typeof x === "string" && (VISUAL_CHECKS as readonly string[]).includes(x)) || new Set(o.checks).size !== o.checks.length) throw new ScenarioError(`step ${i}: checks must be a non-empty subset of ${VISUAL_CHECKS.join(", ")} without repeats`);
          checks = o.checks as VisualCheck[];
        }
        return { kind: "expectVisualQuality", name: s(o.name, `step ${i}.name`, 200), ...(viewports ? { viewports } : {}), ...(checks ? { checks } : {}), ...(c ? { criteria: c } : {}) };
      }
      default:
        return { kind: "screenshot", name: s(o.name, `step ${i}.name`, 100) };
    }
  });
  if (out[0]?.kind !== "goto") throw new ScenarioError("the first step must be goto");
  let measured = 0;
  for (const st of out) if (st.kind === "expectVisualQuality") measured += (st.viewports ?? DEFAULT_VIEWPORTS).length;
  if (out.filter((st) => st.kind === "expectScreenshotMatch").length > MAX_SCREENSHOT_MATCHES) throw new ScenarioError(`a scenario may contain at most ${MAX_SCREENSHOT_MATCHES} expectScreenshotMatch steps`);
  if (measured > MAX_VISUAL_VIEWPORTS_PER_SCENARIO) throw new ScenarioError(`a scenario may measure at most ${MAX_VISUAL_VIEWPORTS_PER_SCENARIO} viewports in total across expectVisualQuality steps (found ${measured})`);
  return out;
}
