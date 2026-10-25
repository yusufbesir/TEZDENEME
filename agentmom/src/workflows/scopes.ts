// Write scopes are repository-relative POSIX prefixes ("src/a", "docs"); "." means the whole repository.
export function normalizeScope(raw: string): string {
  const s = raw.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
  if (s === "" || s === ".") return ".";
  if (s.startsWith("/") || /^[a-zA-Z]:/.test(s) || s.includes("\0")) throw new Error(`scope must be repository-relative: ${raw}`);
  const parts = s.split("/");
  if (parts.some((p) => p === ".." || p === "" || p === ".")) throw new Error(`scope must not contain '..' or empty segments: ${raw}`);
  return parts.join("/");
}

export function inScope(file: string, scope: string): boolean {
  const f = file.replace(/\\/g, "/");
  return scope === "." || f === scope || f.startsWith(scope + "/");
}

export function inAnyScope(file: string, scopes: string[]): boolean {
  return scopes.some((s) => inScope(file, s));
}

export function scopesOverlap(a: string, b: string): boolean {
  return inScope(a, b) || inScope(b, a);
}

export function conflictingScopes(mine: string[], theirs: string[]): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const m of mine) for (const t of theirs) if (scopesOverlap(m, t)) out.push([m, t]);
  return out;
}
