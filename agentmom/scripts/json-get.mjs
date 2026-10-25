// Reads JSON on stdin and prints the value at a dotted path. "a.b[].c" maps over an array and joins with ", ". No code is evaluated.
let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  const parts = (process.argv[2] ?? "").split(".").filter(Boolean);
  const walk = (value, path) => {
    if (path.length === 0) return value;
    const [head, ...rest] = path;
    if (head.endsWith("[]")) {
      const arr = value?.[head.slice(0, -2)];
      return Array.isArray(arr) ? arr.map((x) => walk(x, rest)) : undefined;
    }
    return walk(value?.[head], rest);
  };
  const out = walk(JSON.parse(input), parts);
  const show = (x) => (x !== null && typeof x === "object" ? JSON.stringify(x) : String(x));
  console.log(Array.isArray(out) ? out.map(show).join(", ") : out !== null && typeof out === "object" ? JSON.stringify(out) : String(out));
});
