import { lstatSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Symlinks, Windows junctions and multiply-linked files inside a workspace could let agent-written code (or a served site) reach files outside
// the granted directory, because Node's permission model and a static server follow links. Any such entry makes the workspace unfit for verification.
// Everything is scanned, including a .git directory (only a worktree's plain .git file is expected there).
export function findLinks(root: string, limit = 50_000): string[] {
  const found: string[] = [];
  let seen = 0;
  const walk = (dir: string, rel: string): void => {
    for (const name of readdirSync(dir)) {
      if (++seen > limit) throw new Error(`workspace has more than ${limit} entries; refusing to scan further`);
      const abs = join(dir, name);
      const r = rel ? `${rel}/${name}` : name;
      const st = lstatSync(abs);
      if (st.isSymbolicLink()) found.push(r);
      else if (st.isDirectory()) walk(abs, r);
      else if (st.isFile() && st.nlink > 1) found.push(`${r} (hard link x${st.nlink})`);
    }
  };
  walk(root, "");
  return found;
}
