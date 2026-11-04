export interface ParsedCase {
  suite: string | null;
  name: string;
  file: string | null;
  timeMs: number;
  outcome: "passed" | "failed" | "skipped";
  message: string | null;
  detail: string | null;
}

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_m, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function attrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of raw.matchAll(/([A-Za-z_:][\w:.-]*)="([^"]*)"/g)) out[m[1] as string] = decode(m[2] as string);
  return out;
}

// Reads the JUnit XML that `node --test --test-reporter=junit` writes. Tolerant of nesting; unknown tags are ignored.
export function parseJunit(xml: string): ParsedCase[] {
  const out: ParsedCase[] = [];
  const stack: string[] = [];
  const re = /<(\/?)(testsuite|testcase)\b([^>]*?)(\/?)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const closing = m[1] === "/";
    const tag = m[2];
    const selfClosing = m[4] === "/";
    if (tag === "testsuite") {
      if (closing) stack.pop();
      else if (!selfClosing) stack.push(attrs(m[3] as string).name ?? "");
      continue;
    }
    if (closing) continue;
    const a = attrs(m[3] as string);
    let body = "";
    if (!selfClosing) {
      const end = xml.indexOf("</testcase>", re.lastIndex);
      body = end >= 0 ? xml.slice(re.lastIndex, end) : "";
      if (end >= 0) re.lastIndex = end + "</testcase>".length;
    }
    const failure = /<failure\b([^>]*)>([\s\S]*?)<\/failure>|<failure\b([^>]*)\/>/.exec(body);
    const skipped = /<skipped\b/.test(body);
    const failAttrs = failure ? attrs((failure[1] ?? failure[3] ?? "") as string) : {};
    const outcome = failure ? "failed" : skipped ? "skipped" : "passed";
    out.push({
      suite: stack.length ? stack.join(" > ") : null,
      name: a.name ?? "(unnamed)",
      file: a.file ?? null,
      timeMs: Math.round((Number(a.time) || 0) * 1000),
      outcome,
      message: failure ? (failAttrs.message ?? "test failed") : null,
      detail: failure ? decode((failure[2] ?? "").replace(/<!\[CDATA\[|\]\]>/g, "")).slice(0, 4000) : null,
    });
  }
  return out;
}
