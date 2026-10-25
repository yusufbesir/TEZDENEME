// Static Command Panel files (Faz 8, redesigned in Faz 10). Owner: Claude [IP:AgentMom Faz 10].
// Exactly the fixed files below are served, read once at startup from the ui/ folder next to this module: no path is ever built from the request,
// so there is nothing to traverse. The page carries no secret (the token lives in the user's tab), and every response gets a strict CSP.
// A missing panel file must never crash the server: that route answers 503 with a readable text and the problem is logged once.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ServerResponse } from "node:http";

const DIR = join(import.meta.dirname, "ui");

export const UI_FILES: Record<string, { file: string; type: string }> = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/ui/tokens.css": { file: "tokens.css", type: "text/css; charset=utf-8" },
  "/ui/layout.css": { file: "layout.css", type: "text/css; charset=utf-8" },
  "/ui/sidebar.css": { file: "sidebar.css", type: "text/css; charset=utf-8" },
  "/ui/menu.css": { file: "menu.css", type: "text/css; charset=utf-8" },
  "/ui/chat.css": { file: "chat.css", type: "text/css; charset=utf-8" },
  "/ui/panel.css": { file: "panel.css", type: "text/css; charset=utf-8" },
  "/ui/settings.css": { file: "settings.css", type: "text/css; charset=utf-8" },
  "/ui/shell.css": { file: "shell.css", type: "text/css; charset=utf-8" },
  "/ui/strings.js": { file: "strings.js", type: "text/javascript; charset=utf-8" },
  "/ui/strings-en.js": { file: "strings-en.js", type: "text/javascript; charset=utf-8" },
  "/ui/prefs.js": { file: "prefs.js", type: "text/javascript; charset=utf-8" },
  "/ui/icons.js": { file: "icons.js", type: "text/javascript; charset=utf-8" },
  "/ui/safe.js": { file: "safe.js", type: "text/javascript; charset=utf-8" },
  "/ui/chat.js": { file: "chat.js", type: "text/javascript; charset=utf-8" },
  "/ui/sidebar.js": { file: "sidebar.js", type: "text/javascript; charset=utf-8" },
  "/ui/usermenu.js": { file: "usermenu.js", type: "text/javascript; charset=utf-8" },
  "/ui/panel.js": { file: "panel.js", type: "text/javascript; charset=utf-8" },
  "/ui/settings.js": { file: "settings.js", type: "text/javascript; charset=utf-8" },
  "/ui/help.js": { file: "help.js", type: "text/javascript; charset=utf-8" },
  "/ui/usage.js": { file: "usage.js", type: "text/javascript; charset=utf-8" },
  "/ui/shell.js": { file: "shell.js", type: "text/javascript; charset=utf-8" },
  "/ui/palette.js": { file: "palette.js", type: "text/javascript; charset=utf-8" },
  "/ui/ring.js": { file: "ring.js", type: "text/javascript; charset=utf-8" },
  "/ui/core.js": { file: "core.js", type: "text/javascript; charset=utf-8" },
  "/ui/pages.css": { file: "pages.css", type: "text/css; charset=utf-8" },
  "/ui/page-providers.css": { file: "page-providers.css", type: "text/css; charset=utf-8" },
  "/ui/page-more.css": { file: "page-more.css", type: "text/css; charset=utf-8" },
  "/ui/pages.js": { file: "pages.js", type: "text/javascript; charset=utf-8" },
  "/ui/page-overview.js": { file: "page-overview.js", type: "text/javascript; charset=utf-8" },
  "/ui/page-projects.js": { file: "page-projects.js", type: "text/javascript; charset=utf-8" },
  "/ui/page-tasks.js": { file: "page-tasks.js", type: "text/javascript; charset=utf-8" },
  "/ui/page-security.js": { file: "page-security.js", type: "text/javascript; charset=utf-8" },
  "/ui/page-audit.js": { file: "page-audit.js", type: "text/javascript; charset=utf-8" },
  "/ui/wf-editor.js": { file: "wf-editor.js", type: "text/javascript; charset=utf-8" },
  "/ui/page-providers.js": { file: "page-providers.js", type: "text/javascript; charset=utf-8" },
  "/ui/page-models.js": { file: "page-models.js", type: "text/javascript; charset=utf-8" },
  "/ui/page-usage.js": { file: "page-usage.js", type: "text/javascript; charset=utf-8" },
  "/ui/page-integrations.js": { file: "page-integrations.js", type: "text/javascript; charset=utf-8" },
  "/ui/page-skills.js": { file: "page-skills.js", type: "text/javascript; charset=utf-8" },
  "/ui/page-research.js": { file: "page-research.js", type: "text/javascript; charset=utf-8" },
  "/ui/page-memory.js": { file: "page-memory.js", type: "text/javascript; charset=utf-8" },
  "/ui/page-verify.js": { file: "page-verify.js", type: "text/javascript; charset=utf-8" },
  "/ui/capabilities.js": { file: "capabilities.js", type: "text/javascript; charset=utf-8" },
  "/ui/icon.png": { file: "icon.png", type: "image/png" },
  "/favicon.ico": { file: "icon.png", type: "image/png" },
};

const CACHE = new Map<string, Buffer>();
export const MISSING: string[] = [];
for (const [route, f] of Object.entries(UI_FILES)) {
  try {
    CACHE.set(route, readFileSync(join(DIR, f.file)));
  } catch {
    MISSING.push(f.file);
  }
}
if (MISSING.length > 0) console.error(`panel files missing (those routes answer 503): ${MISSING.join(", ")}`);

// No inline script or style, no framing, no outside connections, no form posts, no base tag.
export const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

export function uiHeaders(type: string, length: number): Record<string, string | number> {
  return {
    "content-type": type,
    "content-length": length,
    "cache-control": "no-store",
    "content-security-policy": CSP,
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  };
}

// Returns true when the request was a panel file and has been answered.
export function serveUi(method: string, pathname: string, res: ServerResponse): boolean {
  if (method !== "GET" || !Object.hasOwn(UI_FILES, pathname)) return false;
  const body = CACHE.get(pathname);
  if (!body) {
    const text = Buffer.from("Arayüz dosyası eksik; sunucu günlüğüne bakın.", "utf8");
    res.writeHead(503, uiHeaders("text/plain; charset=utf-8", text.length));
    res.end(text);
    return true;
  }
  res.writeHead(200, uiHeaders((UI_FILES[pathname] as { type: string }).type, body.length));
  res.end(body);
  return true;
}
