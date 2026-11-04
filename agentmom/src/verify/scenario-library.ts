// Sahip: Claude [İP:AgentMom madde 18/52]; yalnız yazan yapay zeka değiştirir.
// Senaryo KÜTÜPHANESİ: adlandırılmış, parametreli, TAMAMEN bildirimsel şablonlar (veri). Bir şablon yalnız scenario.ts adımları üretir;
// kod, betik ya da serbest ifade YOKTUR. Çıktı validateScenario'dan geçirilir (adım sayısı <= MAX_STEPS, alan/uzunluk sınırları, görsel görünüm sınırı).
import { DEFAULT_VIEWPORTS, MAX_STEPS, MAX_VIEWPORTS, ScenarioError, VIEWPORT_MAX, VIEWPORT_MIN, isSitePath, validateScenario } from "./scenario.ts";
import type { ScenarioStep, VisualViewport } from "./scenario.ts";

export const TEMPLATE_NAMES = ["smoke", "form-submit", "keyboard-order", "navigation", "responsive-smoke"] as const;
export type TemplateName = (typeof TEMPLATE_NAMES)[number];
export const MAX_TEMPLATES = 10;

export interface TemplateUse {
  name: TemplateName;
  params: Record<string, unknown>;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function onlyKeys(o: Record<string, unknown>, allowed: string[], where: string): void {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) throw new ScenarioError(`${where}: unknown parameter ${k}`);
}

function str(v: unknown, where: string, max: number): string {
  if (typeof v !== "string" || v.length === 0 || v.length > max) throw new ScenarioError(`${where} must be a non-empty string of at most ${max} characters`);
  return v;
}

function sitePath(v: unknown, where: string): string {
  if (!isSitePath(v)) throw new ScenarioError(`${where} must be a site-relative path starting with /`);
  return v;
}

function list(v: unknown, where: string, min: number, max: number): unknown[] {
  if (!Array.isArray(v) || v.length < min || v.length > max) throw new ScenarioError(`${where} must list ${min} to ${max} items`);
  return v;
}

// Test adlarına giren yol/seçici kısaltılır (ad sınırı 200).
const short = (s: string, n = 60): string => (s.length > n ? `${s.slice(0, n)}...` : s);

function viewports(v: unknown, where: string): VisualViewport[] {
  if (v === undefined) return [...DEFAULT_VIEWPORTS];
  return list(v, where, 1, MAX_VIEWPORTS).map((raw, k) => {
    if (!isObj(raw)) throw new ScenarioError(`${where}[${k}] must be an object`);
    onlyKeys(raw, ["width", "height"], `${where}[${k}]`);
    const dim = (x: unknown, what: string): number => {
      if (typeof x !== "number" || !Number.isInteger(x) || x < VIEWPORT_MIN || x > VIEWPORT_MAX) throw new ScenarioError(`${where}[${k}].${what} must be an integer from ${VIEWPORT_MIN} to ${VIEWPORT_MAX}`);
      return x;
    };
    return { width: dim(raw.width, "width"), height: dim(raw.height, "height") };
  });
}

function smoke(p: Record<string, unknown>): ScenarioStep[] {
  onlyKeys(p, ["paths"], "smoke");
  const out: ScenarioStep[] = [];
  for (const [i, path] of list(p.paths, "smoke.paths", 1, 10).entries()) {
    const pth = sitePath(path, `smoke.paths[${i}]`);
    const tag = `smoke ${short(pth)}`;
    out.push(
      { kind: "goto", path: pth },
      { kind: "expectCount", selector: "title:not(:empty)", min: 1, name: `${tag}: title is not empty` },
      { kind: "expectVisible", selector: "body", name: `${tag}: body is visible and not empty` },
      { kind: "expectNoConsoleErrors", name: `${tag}: no console errors` },
    );
  }
  return out;
}

function formSubmit(p: Record<string, unknown>): ScenarioStep[] {
  onlyKeys(p, ["path", "fields", "submit", "expectText"], "form-submit");
  const path = sitePath(p.path, "form-submit.path");
  const out: ScenarioStep[] = [{ kind: "goto", path }];
  for (const [i, f] of list(p.fields, "form-submit.fields", 1, 20).entries()) {
    if (!isObj(f)) throw new ScenarioError(`form-submit.fields[${i}] must be an object`);
    onlyKeys(f, ["selector", "value"], `form-submit.fields[${i}]`);
    if (typeof f.value !== "string" || f.value.length > 500) throw new ScenarioError(`form-submit.fields[${i}].value must be a string of at most 500 characters`);
    out.push({ kind: "fill", selector: str(f.selector, `form-submit.fields[${i}].selector`, 200), value: f.value });
  }
  out.push({ kind: "click", selector: str(p.submit, "form-submit.submit", 200) });
  // expectText: düz metin (gövdede aranır) ya da {selector, text}.
  let sel = "body";
  let text: string;
  if (typeof p.expectText === "string") text = str(p.expectText, "form-submit.expectText", 500);
  else if (isObj(p.expectText)) {
    onlyKeys(p.expectText, ["selector", "text"], "form-submit.expectText");
    sel = str(p.expectText.selector, "form-submit.expectText.selector", 200);
    text = str(p.expectText.text, "form-submit.expectText.text", 500);
  } else throw new ScenarioError("form-submit.expectText must be a text or an object {selector, text}");
  const tag = `form-submit ${short(path)}`;
  out.push({ kind: "expectText", selector: sel, text, name: `${tag}: result text appears` }, { kind: "expectNoConsoleErrors", name: `${tag}: no console errors` });
  return out;
}

function keyboardOrder(p: Record<string, unknown>): ScenarioStep[] {
  onlyKeys(p, ["path", "selectors"], "keyboard-order");
  const path = sitePath(p.path, "keyboard-order.path");
  const out: ScenarioStep[] = [{ kind: "goto", path }];
  for (const [i, sel] of list(p.selectors, "keyboard-order.selectors", 1, 20).entries()) {
    const selector = str(sel, `keyboard-order.selectors[${i}]`, 200);
    out.push({ kind: "press", key: "Tab" }, { kind: "expectFocused", selector, name: `keyboard-order ${short(path, 40)}: Tab #${i + 1} focuses ${short(selector, 80)}` });
  }
  return out;
}

function navigation(p: Record<string, unknown>): ScenarioStep[] {
  onlyKeys(p, ["path", "links"], "navigation");
  const start = p.path === undefined ? "/" : sitePath(p.path, "navigation.path");
  const out: ScenarioStep[] = [];
  for (const [i, l] of list(p.links, "navigation.links", 1, 15).entries()) {
    if (!isObj(l)) throw new ScenarioError(`navigation.links[${i}] must be an object`);
    onlyKeys(l, ["selector", "expectPath"], `navigation.links[${i}]`);
    const selector = str(l.selector, `navigation.links[${i}].selector`, 200);
    const expectPath = sitePath(l.expectPath, `navigation.links[${i}].expectPath`);
    out.push({ kind: "goto", path: start }, { kind: "click", selector }, { kind: "expectUrl", path: expectPath, name: `navigation: ${short(selector, 80)} leads to ${short(expectPath, 80)}` });
  }
  return out;
}

function responsiveSmoke(p: Record<string, unknown>): ScenarioStep[] {
  onlyKeys(p, ["paths", "viewports"], "responsive-smoke");
  const vps = viewports(p.viewports, "responsive-smoke.viewports");
  const out: ScenarioStep[] = [];
  for (const [i, path] of list(p.paths, "responsive-smoke.paths", 1, 8).entries()) {
    const pth = sitePath(path, `responsive-smoke.paths[${i}]`);
    out.push({ kind: "goto", path: pth }, { kind: "expectVisualQuality", name: `responsive-smoke ${short(pth)}`, viewports: vps });
  }
  return out;
}

const BUILDERS: Record<TemplateName, (p: Record<string, unknown>) => ScenarioStep[]> = {
  smoke,
  "form-submit": formSubmit,
  "keyboard-order": keyboardOrder,
  navigation,
  "responsive-smoke": responsiveSmoke,
};

// Bilinmeyen şablon / parametre reddedilir; üretilen adımlar validateScenario'dan geçer (adım sayısı <= MAX_STEPS dahil).
export function expandTemplate(name: string, params: unknown): ScenarioStep[] {
  if (typeof name !== "string" || !Object.hasOwn(BUILDERS, name)) throw new ScenarioError(`unknown template ${typeof name === "string" ? short(name, 40) : typeof name}`);
  if (!isObj(params)) throw new ScenarioError(`template ${name}: params must be an object`);
  const steps = BUILDERS[name as TemplateName](params);
  if (steps.length > MAX_STEPS) throw new ScenarioError(`template ${name} would produce ${steps.length} steps (limit ${MAX_STEPS})`);
  return validateScenario(steps);
}

// Plan alanı browser.templates: [{name, params}] doğrulaması (her şablon genişletilerek denenir).
export function validateTemplateList(input: unknown): TemplateUse[] {
  const items = list(input, "templates", 1, MAX_TEMPLATES);
  return items.map((raw, i): TemplateUse => {
    if (!isObj(raw)) throw new ScenarioError(`templates[${i}] must be an object`);
    onlyKeys(raw, ["name", "params"], `templates[${i}]`);
    if (typeof raw.name !== "string" || !Object.hasOwn(BUILDERS, raw.name)) throw new ScenarioError(`templates[${i}]: unknown template`);
    if (!isObj(raw.params)) throw new ScenarioError(`templates[${i}].params must be an object`);
    expandTemplate(raw.name, raw.params);
    return { name: raw.name as TemplateName, params: raw.params };
  });
}

export function expandTemplates(uses: TemplateUse[]): ScenarioStep[] {
  return uses.flatMap((u) => expandTemplate(u.name, u.params));
}
