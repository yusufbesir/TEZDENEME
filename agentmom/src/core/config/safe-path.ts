import { lstatSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

// Resolves a workspace-relative path and refuses it when any existing component is a symlink or junction,
// or when the real location is no longer inside the root. Missing components are fine (they will be created inside).
export function resolveInsideRoot(root: string, rel: string): string {
  if (isAbsolute(rel) || rel.split(/[\\/]/).includes("..")) throw new Error(`path must stay inside the workspace: ${rel}`);
  const realRoot = realpathSync(root);
  const target = resolve(realRoot, rel);
  const parts = relative(realRoot, target).split(sep).filter(Boolean);
  let current = realRoot;
  for (const part of parts) {
    current = join(current, part);
    let info;
    try {
      info = lstatSync(current);
    } catch {
      break;
    }
    if (info.isSymbolicLink()) throw new Error(`refusing symlink or junction in data path: ${current}`);
  }
  const existing = parts.length > 0 ? current : realRoot;
  const real = realpathSync(lstatExists(existing) ? existing : realRoot);
  const back = relative(realRoot, real);
  if (back.startsWith("..") || isAbsolute(back)) throw new Error(`data path resolves outside the workspace: ${rel}`);
  return target;
}

function lstatExists(p: string): boolean {
  try {
    lstatSync(p);
    return true;
  } catch {
    return false;
  }
}
