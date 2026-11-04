// AgentMom arayüzü güvenli çizim modülü (Faz 11, dilim 2): AM_MD (güvenli markdown), AM_STATUS (durum gruplama),
// AM_DIALOG (erişilebilir onay penceresi), AM_NAME (alt oturum adı temizleme + model uyuşmazlığı).
// Sahip: Yusuf. Yazan: Claude [İP:AgentMom Faz 11, safe.js]. Değiştirme kuralı: yalnız bu dosyayı yazan Claude iş parçacığı
// değiştirir; bağlayıcı belgeler docs/tasarim/masaustu-arayuz-sozlesmesi-faz11.md ve docs/tasarim/arayuz-sozlesmesi.md (güvenlik).
// Güvenlik özeti: sunucu/ajan metni DOM'a yalnız createElement/createTextNode/textContent ile girer; HTML ayrıştıran hiçbir
// DOM API'si, dinamik kod çalıştırma ya da tarayıcı depolaması kullanılmaz. Bağlantılar yalnız http:/https: şemasıyla, kullanıcı
// bilgisi (@) içermeden ve rel="noopener noreferrer" ile çizilir; görseller çizilmez. Ayrıştırıcı elle yazılmış doğrusal
// taramadır (geri izlemeli düzenli ifade yok), girdi 200.000 karakterle ve iç içe derinlik sabit sınırla kısıtlıdır.
// Yükleme sırasında DOM'a dokunulmaz; saf mantık window.AM_<AD>.pure altında açıktır (testler node:vm ile yükler).
"use strict";
(function (window) {
  var has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  // ---------------------------------------------------------------- metinler
  var TR = {
    "safe.md.truncated": "… (metin kısaltıldı: {n} karakter sınırı aşıldı)",
    "safe.md.copy": "Kopyala",
    "safe.md.copyAria": "Kod bloğunu kopyala",
    "safe.dialog.title": "Onay gerekiyor",
    "safe.dialog.action": "Eylem",
    "safe.dialog.target": "Hedef",
    "safe.dialog.confirm": "Onayla",
    "safe.dialog.cancel": "Vazgeç"
  };
  var TR_STATUS = {
    "status.pending": "Bekliyor",
    "status.awaiting_approval": "Onay bekliyor",
    "status.blocked": "Engellendi",
    "status.failed": "Başarısız",
    "status.unavailable": "Kullanılamıyor",
    "status.running": "Çalışıyor",
    "status.approved": "Onaylandı, çalışmayı bekliyor",
    "status.idle": "Boşta",
    "status.created": "Oluşturuldu",
    "status.succeeded": "Başarılı",
    "status.done": "Tamamlandı",
    "status.cancelled": "İptal edildi",
    "status.denied": "Reddedildi",
    "status.unknown": "Bilinmeyen durum"
  };
  try {
    if (typeof window.AM_REGISTER_TR === "function") {
      window.AM_REGISTER_TR("safe", TR);
      window.AM_REGISTER_TR("status", TR_STATUS);
    }
  } catch (e) { /* kayıt başarısızsa yerel metinler kullanılır */ }

  function fill(str, vars) {
    var s = String(str);
    if (!vars) return s;
    for (var k in vars) if (has(vars, k)) s = s.split("{" + k + "}").join(String(vars[k] == null ? "" : vars[k]));
    return s;
  }
  // AM_T varsa onu kullanır; bilinmeyen anahtarda (⟦…⟧) yerel metne döner.
  function T(key, vars) {
    if (typeof window.AM_T === "function") {
      try {
        var s = window.AM_T(key, vars);
        if (typeof s === "string" && s !== "" && s.charAt(0) !== "⟦") return s;
      } catch (e) { /* yerel metin */ }
    }
    var base = has(TR, key) ? TR[key] : has(TR_STATUS, key) ? TR_STATUS[key] : "⟦" + key + "⟧";
    return fill(base, vars);
  }
  // Çağıranın verdiği metin bir anahtar olabilir: AM_T tanıyorsa çevirisi, tanımıyorsa metnin kendisi.
  function TX(text) {
    var s = text == null ? "" : String(text);
    if (s && typeof window.AM_T === "function") {
      try {
        var r = window.AM_T(s);
        if (typeof r === "string" && r !== "" && r.charAt(0) !== "⟦") return r;
      } catch (e) { /* metnin kendisi */ }
    }
    return s;
  }

  // ---------------------------------------------------------------- ortak karakter sınıfları
  function isInvisibleOrBidi(c) {
    return (c >= 0x200B && c <= 0x200F) || (c >= 0x202A && c <= 0x202E) || (c >= 0x2066 && c <= 0x2069) ||
      c === 0x2060 || c === 0xFEFF || c === 0x061C || c === 0x00AD || c === 0x180E;
  }
  function isControl(c) { return c <= 0x1F || (c >= 0x7F && c <= 0x9F); }
  function isSpaceCode(c) {
    return c === 0x20 || c === 0x09 || c === 0x0A || c === 0x0D || c === 0x0C || c === 0x0B || c === 0xA0 ||
      c === 0x2028 || c === 0x2029 || c === 0x3000 || (c >= 0x2000 && c <= 0x200A) || c === 0x202F || c === 0x205F;
  }
  function isSpace(ch) { return ch !== "" && isSpaceCode(ch.charCodeAt(0)); }

  // ================================================================ AM_MD
  var MAX_LEN = 200000;
  var MAX_BLOCK_DEPTH = 6;    // alıntı içinde alıntı vb.
  var MAX_INLINE_DEPTH = 4;   // kalın içinde italik vb.
  var MAX_TABLE_COLS = 32;
  var MAX_LANG = 32;
  var MAX_HREF = 2048;
  var MAX_TICKS = 32;
  var CLASSES = {
    "am-md-p": 1, "am-md-h1": 1, "am-md-h2": 1, "am-md-h3": 1, "am-md-h4": 1, "am-md-code": 1, "am-md-pre": 1,
    "am-md-quote": 1, "am-md-ul": 1, "am-md-ol": 1, "am-md-table": 1, "am-md-chip": 1, "am-md-hr": 1
  };

  // Bağlantı adresi denetimi: yalnız http(s), boşluk/denetim/görünmez/çift yönlü karakter yok, ters eğik çizgi yok,
  // kullanıcı bilgisi (@) yok, ana makine boş değil. Varlık/yüzde kodlaması çözülmez: "&#x6a;avascript:" şemasız sayılır.
  function safeHref(raw) {
    if (typeof raw !== "string" || raw === "" || raw.length > MAX_HREF) return null;
    for (var i = 0; i < raw.length; i++) {
      var c = raw.charCodeAt(i);
      if (c <= 0x20 || isControl(c) || isInvisibleOrBidi(c) || isSpaceCode(c) || c === 0x5C) return null;
    }
    var scheme, rest;
    if (raw.slice(0, 8).toLowerCase() === "https://") { scheme = "https://"; rest = raw.slice(8); }
    else if (raw.slice(0, 7).toLowerCase() === "http://") { scheme = "http://"; rest = raw.slice(7); }
    else return null;
    var end = rest.length;
    for (var k = 0; k < rest.length; k++) {
      var ch = rest.charAt(k);
      if (ch === "/" || ch === "?" || ch === "#") { end = k; break; }
    }
    var auth = rest.slice(0, end);
    if (auth === "" || auth.indexOf("@") >= 0) return null;
    for (var a = 0; a < auth.length; a++) {
      var hc = auth.charCodeAt(a);
      var ok = (hc >= 0x30 && hc <= 0x39) || (hc >= 0x41 && hc <= 0x5A) || (hc >= 0x61 && hc <= 0x7A) ||
        hc === 0x2E || hc === 0x2D || hc === 0x5F || hc === 0x3A || hc === 0x5B || hc === 0x5D || hc > 0x7F;
      if (!ok) return null;
    }
    if (!/[A-Za-z0-9\u0080-￿]/.test(auth)) return null;
    return scheme + rest;
  }

  // ---- satır düzeyi yardımcılar (hepsi doğrusal)
  function indentOf(line) {
    var n = 0;
    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      if (ch === " ") n++;
      else if (ch === "\t") n += 4;
      else break;
    }
    return n;
  }
  function leadLen(line) { var i = 0; while (i < line.length && (line.charAt(i) === " " || line.charAt(i) === "\t")) i++; return i; }
  function isBlank(line) { for (var i = 0; i < line.length; i++) if (!isSpace(line.charAt(i))) return false; return true; }

  function fenceInfo(line) {
    if (line == null || indentOf(line) > 3) return null;
    var rest = line.slice(leadLen(line));
    var n = 0;
    while (n < rest.length && rest.charAt(n) === "`") n++;
    if (n < 3) return null;
    var info = rest.slice(n).trim();
    if (info.indexOf("`") >= 0) return null;
    return { n: n, lang: info.split(/\s/)[0].slice(0, MAX_LANG) };
  }
  function isFenceClose(line, n) {
    if (indentOf(line) > 3) return false;
    var rest = line.slice(leadLen(line));
    var k = 0;
    while (k < rest.length && rest.charAt(k) === "`") k++;
    return k >= n && rest.slice(k).trim() === "";
  }
  function headingInfo(line) {
    if (line == null || indentOf(line) > 3) return null;
    var rest = line.slice(leadLen(line));
    var n = 0;
    while (n < rest.length && rest.charAt(n) === "#") n++;
    if (n < 1 || n > 4) return null;
    if (n < rest.length && rest.charAt(n) !== " " && rest.charAt(n) !== "\t") return null;
    var content = rest.slice(n).trim();
    var e = content.length;
    while (e > 0 && content.charAt(e - 1) === "#") e--;
    if (e === 0) content = "";
    else if (e < content.length && (content.charAt(e - 1) === " " || content.charAt(e - 1) === "\t")) content = content.slice(0, e).trim();
    return { level: n, text: content };
  }
  function isHr(line) {
    if (line == null || indentOf(line) > 3) return false;
    var mark = "", count = 0;
    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      if (ch === " " || ch === "\t") continue;
      if (ch !== "-" && ch !== "*" && ch !== "_") return false;
      if (mark === "") mark = ch; else if (ch !== mark) return false;
      count++;
    }
    return count >= 3;
  }
  function isQuote(line) { return line != null && indentOf(line) <= 3 && line.charAt(leadLen(line)) === ">"; }
  function listInfo(line) {
    if (line == null) return null;
    var lead = leadLen(line), ind = indentOf(line), rest = line.slice(lead);
    var c0 = rest.charAt(0);
    if ((c0 === "-" || c0 === "*" || c0 === "+") && (rest.length === 1 || rest.charAt(1) === " " || rest.charAt(1) === "\t")) {
      return { ordered: false, ind: ind, start: 1, text: rest.slice(2) };
    }
    var d = 0;
    while (d < rest.length && d < 10 && rest.charCodeAt(d) >= 0x30 && rest.charCodeAt(d) <= 0x39) d++;
    if (d >= 1 && d <= 9 && (rest.charAt(d) === "." || rest.charAt(d) === ")") &&
      (rest.length === d + 1 || rest.charAt(d + 1) === " " || rest.charAt(d + 1) === "\t")) {
      return { ordered: true, ind: ind, start: parseInt(rest.slice(0, d), 10), text: rest.slice(d + 2) };
    }
    return null;
  }
  function isDelimRow(line) {
    if (line == null || line.indexOf("|") < 0 || line.indexOf("-") < 0) return false;
    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      if (ch !== "|" && ch !== "-" && ch !== ":" && ch !== " " && ch !== "\t") return false;
    }
    return true;
  }
  function isTableStart(line, next) { return line != null && line.indexOf("|") >= 0 && !isDelimRow(line) && isDelimRow(next); }
  function isBlockStart(line, next) {
    return fenceInfo(line) !== null || headingInfo(line) !== null || isHr(line) || isQuote(line) ||
      listInfo(line) !== null || isTableStart(line, next);
  }
  function splitCells(line) {
    var s = line.trim();
    if (s.charAt(0) === "|") s = s.slice(1);
    if (s.length > 0 && s.charAt(s.length - 1) === "|" && s.charAt(s.length - 2) !== "\\") s = s.slice(0, -1);
    var cells = [], cur = "", tick = 0;
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (ch === "\\" && s.charAt(i + 1) === "|") { cur += "|"; i++; continue; }
      if (ch === "`") { // satır içi kod içindeki | hücre ayırmaz (aynı uzunlukta kapanan backtick dizisine kadar)
        var r = 0;
        while (i + r < s.length && s.charAt(i + r) === "`") r++;
        tick = tick === 0 ? r : (tick === r ? 0 : tick);
        cur += s.slice(i, i + r);
        i += r - 1;
        continue;
      }
      if (ch === "|" && tick === 0) { cells.push(cur.trim()); cur = ""; if (cells.length >= MAX_TABLE_COLS) return cells; continue; }
      cur += ch;
    }
    cells.push(cur.trim());
    return cells.slice(0, MAX_TABLE_COLS);
  }

  // ---- blok ayrıştırma
  function parseBlocks(lines, depth) {
    var out = [];
    var i = 0;
    while (i < lines.length) {
      var line = lines[i];
      if (isBlank(line)) { i++; continue; }

      var f = fenceInfo(line);
      if (f) {
        var body = [];
        i++;
        while (i < lines.length && !isFenceClose(lines[i], f.n)) { body.push(lines[i]); i++; }
        if (i < lines.length) i++; // kapanış çiti
        out.push({ type: "pre", lang: f.lang, text: body.join("\n") });
        continue;
      }
      var h = headingInfo(line);
      if (h) { out.push({ type: "h", level: h.level, children: parseInline(h.text, 0, false) }); i++; continue; }
      if (isHr(line)) { out.push({ type: "hr" }); i++; continue; }
      if (isQuote(line)) {
        var q = [];
        while (i < lines.length && isQuote(lines[i])) {
          var ql = lines[i], p = leadLen(ql) + 1;
          if (ql.charAt(p) === " ") p++;
          q.push(ql.slice(p));
          i++;
        }
        if (depth + 1 >= MAX_BLOCK_DEPTH) {
          out.push({ type: "quote", children: [{ type: "p", children: parseInline(q.join("\n"), 0, false) }] });
        } else {
          out.push({ type: "quote", children: parseBlocks(q, depth + 1) });
        }
        continue;
      }
      if (listInfo(line)) { var r = parseList(lines, i); out.push(r.node); i = r.next; continue; }
      if (isTableStart(line, lines[i + 1])) {
        var head = splitCells(line);
        var cols = head.length;
        var rows = [];
        i += 2;
        while (i < lines.length && !isBlank(lines[i]) && lines[i].indexOf("|") >= 0) {
          var cells = splitCells(lines[i]).slice(0, cols);
          while (cells.length < cols) cells.push("");
          rows.push(cells);
          i++;
        }
        out.push({
          type: "table",
          header: head.map(function (c) { return parseInline(c, 0, false); }),
          rows: rows.map(function (row) { return row.map(function (c) { return parseInline(c, 0, false); }); })
        });
        continue;
      }
      // paragraf
      var para = [line.slice(leadLen(line))];
      i++;
      while (i < lines.length && !isBlank(lines[i]) && !isBlockStart(lines[i], lines[i + 1])) {
        para.push(lines[i].slice(leadLen(lines[i])));
        i++;
      }
      out.push({ type: "p", children: parseInline(para.join("\n"), 0, false) });
    }
    return out;
  }

  // Liste: üst seviye + en çok bir iç içe seviye; daha derin girinti ikinci seviyeye düzleştirilir (liste bombasına karşı).
  function parseList(lines, i) {
    var first = listInfo(lines[i]);
    var base = first.ind;
    var node = { type: first.ordered ? "ol" : "ul", start: first.start, items: [] };
    var cur = null;
    while (i < lines.length) {
      var line = lines[i];
      if (isBlank(line)) break;
      if (isHr(line)) break;
      var li = listInfo(line);
      if (li && li.ind <= base + 1) {
        if (li.ordered !== first.ordered) break;
        cur = { text: li.text, sub: null };
        node.items.push(cur);
        i++;
        continue;
      }
      if (li && cur) {
        if (!cur.sub) cur.sub = { type: li.ordered ? "ol" : "ul", start: li.start, items: [] };
        cur.sub.items.push({ text: li.text, sub: null });
        i++;
        continue;
      }
      if (cur && !isBlockStart(line, lines[i + 1])) {
        var target = cur.sub && indentOf(line) > base + 1 ? cur.sub.items[cur.sub.items.length - 1] : cur;
        target.text += "\n" + line.slice(leadLen(line));
        i++;
        continue;
      }
      break;
    }
    function finish(l) {
      return {
        type: l.type, start: l.start,
        items: l.items.map(function (it) {
          return { children: parseInline(it.text, 0, false), sub: it.sub ? finish(it.sub) : null };
        })
      };
    }
    return { node: finish(node), next: i };
  }

  // ---- satır içi ayrıştırma: tek geçiş; her kapanış araması başarısız olursa not edilir (aynı arama tekrarlanmaz),
  // başarılı arama yalnız tükettiği bölgeyi tarar => çağrı başına doğrusal, toplamda O(n * MAX_INLINE_DEPTH).
  var PUNCT = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
  function isWordChar(ch) { return ch !== "" && /[A-Za-z0-9]/.test(ch); }
  function isUrlStop(c) {
    return c <= 0x20 || isControl(c) || isInvisibleOrBidi(c) || isSpaceCode(c) ||
      c === 0x3C || c === 0x3E || c === 0x22 || c === 0x60 || c === 0x5C;
  }
  function trimUrlTail(u) {
    var open = 0, close = 0, ob = 0, cb = 0;
    for (var i = 0; i < u.length; i++) {
      var ch = u.charAt(i);
      if (ch === "(") open++; else if (ch === ")") close++; else if (ch === "[") ob++; else if (ch === "]") cb++;
    }
    while (u.length > 0) {
      var last = u.charAt(u.length - 1);
      if (".,;:!?'\"*_~".indexOf(last) >= 0) { u = u.slice(0, -1); continue; }
      if (last === ")" && close > open) { u = u.slice(0, -1); close--; continue; }
      if (last === "]" && cb > ob) { u = u.slice(0, -1); cb--; continue; }
      break;
    }
    return u;
  }

  function parseInline(s, depth, noLinks) {
    var out = [], buf = "", i = 0, n = s.length;
    var fail = {};
    var idxCache = {};
    function flush() { if (buf !== "") { out.push({ type: "text", text: buf }); buf = ""; } }
    // indexOf önbelleği: aynı karakter için artan başlangıçlarda tekrar tarama yapmaz.
    function nextIndex(ch, from) {
      var c = idxCache[ch];
      if (c && from >= c.from && (c.pos === -1 || c.pos >= from)) return c.pos;
      var pos = s.indexOf(ch, from);
      idxCache[ch] = { from: from, pos: pos };
      return pos;
    }
    function findTicks(from, len) {
      var k = from;
      while (k < n) {
        if (s.charAt(k) !== "`") { k++; continue; }
        var st = k;
        while (k < n && s.charAt(k) === "`") k++;
        if (k - st === len) return st;
      }
      return -1;
    }
    function findStrongClose(from) {
      for (var k = from + 1; k < n - 1; k++) {
        if (s.charAt(k) === "*" && s.charAt(k + 1) === "*" && !isSpace(s.charAt(k - 1))) return k;
      }
      return -1;
    }
    function findEmClose(from) {
      for (var k = from + 1; k < n; k++) {
        if (s.charAt(k) !== "*") continue;
        if (s.charAt(k + 1) === "*") { k++; continue; }
        if (!isSpace(s.charAt(k - 1))) return k;
      }
      return -1;
    }
    function matchBracket(at) { // s[at] === "["  ->  {text, url, end} | null
      if (fail["]"]) return null;
      var close = nextIndex("]", at + 1);
      if (close < 0) { fail["]"] = true; return null; }
      if (s.charAt(close + 1) !== "(") return null;
      if (fail[")"]) return null;
      var paren = nextIndex(")", close + 2);
      if (paren < 0) { fail[")"] = true; return null; }
      return { text: s.slice(at + 1, close), url: s.slice(close + 2, paren).trim(), end: paren + 1 };
    }

    while (i < n) {
      var c = s.charAt(i);
      if (c === "\\" && i + 1 < n && PUNCT.indexOf(s.charAt(i + 1)) >= 0) { buf += s.charAt(i + 1); i += 2; continue; }
      if (c === "\n") { flush(); out.push({ type: "br" }); i++; continue; }
      if (c === "`") {
        var r = 0;
        while (i + r < n && s.charAt(i + r) === "`") r++;
        if (r <= MAX_TICKS && !fail["`" + r]) {
          var cl = findTicks(i + r, r);
          if (cl >= 0) {
            flush();
            var code = s.slice(i + r, cl).split("\n").join(" ");
            if (code.length > 2 && code.charAt(0) === " " && code.charAt(code.length - 1) === " ") code = code.slice(1, -1);
            out.push({ type: "code", text: code });
            i = cl + r;
            continue;
          }
          fail["`" + r] = true;
        }
        buf += s.slice(i, i + r);
        i += r;
        continue;
      }
      if (c === "*") {
        if (s.charAt(i + 1) === "*") {
          if (depth < MAX_INLINE_DEPTH && !fail["**"] && i + 2 < n && !isSpace(s.charAt(i + 2))) {
            var sc = findStrongClose(i + 2);
            if (sc >= 0) {
              flush();
              out.push({ type: "strong", children: parseInline(s.slice(i + 2, sc), depth + 1, noLinks) });
              i = sc + 2;
              continue;
            }
            fail["**"] = true;
          }
          buf += "**";
          i += 2;
          continue;
        }
        if (depth < MAX_INLINE_DEPTH && !fail["*"] && i + 1 < n && !isSpace(s.charAt(i + 1))) {
          var ec = findEmClose(i + 1);
          if (ec >= 0) {
            flush();
            out.push({ type: "em", children: parseInline(s.slice(i + 1, ec), depth + 1, noLinks) });
            i = ec + 1;
            continue;
          }
          fail["*"] = true;
        }
        buf += "*";
        i++;
        continue;
      }
      if (c === "!" && s.charAt(i + 1) === "[") {
        var im = matchBracket(i + 1);
        if (im) { buf += im.text; i = im.end; continue; } // görsel çizilmez: yalnız alt metni düz metin
        buf += "![";
        i += 2;
        continue;
      }
      if (c === "[") {
        if (!noLinks) {
          var m = matchBracket(i);
          if (m) {
            var href = safeHref(m.url);
            if (href && m.text.trim() !== "") {
              flush();
              out.push({ type: "link", href: href, children: depth < MAX_INLINE_DEPTH ? parseInline(m.text, depth + 1, true) : [{ type: "text", text: m.text }] });
            } else {
              buf += s.slice(i, m.end); // güvensiz şema: olduğu gibi düz metin
            }
            i = m.end;
            continue;
          }
        }
        buf += "[";
        i++;
        continue;
      }
      if ((c === "h" || c === "H") && !noLinks && (i === 0 || !isWordChar(s.charAt(i - 1)))) {
        var head = s.slice(i, i + 8).toLowerCase();
        if (head === "https://" || head.slice(0, 7) === "http://") {
          var e = i;
          while (e < n && !isUrlStop(s.charCodeAt(e))) e++;
          var raw = trimUrlTail(s.slice(i, e));
          var u = safeHref(raw);
          if (u) { flush(); out.push({ type: "chip", href: u, text: raw }); i += raw.length; continue; }
          if (raw.length > 0) { buf += raw; i += raw.length; continue; }
        }
      }
      buf += c;
      i++;
    }
    flush();
    return out;
  }

  function parse(text) {
    var s = text == null ? "" : String(text);
    var truncated = false;
    if (s.length > MAX_LEN) {
      var cut = MAX_LEN;
      var cc = s.charCodeAt(cut - 1);
      if (cc >= 0xD800 && cc <= 0xDBFF) cut--;
      s = s.slice(0, cut);
      truncated = true;
    }
    s = s.split("\r\n").join("\n").split("\r").join("\n").split("\u0000").join("�");
    return { type: "root", truncated: truncated, children: parseBlocks(s.split("\n"), 0) };
  }

  // ---- DOM'a çizim (yalnız createElement/createTextNode/textContent/setAttribute)
  function el(doc, tag, cls) {
    var e = doc.createElement(tag);
    if (cls) {
      if (!has(CLASSES, cls)) throw new Error("AM_MD: izinsiz sınıf adı");
      e.className = cls;
    }
    return e;
  }
  function renderInline(doc, nodes, parent) {
    for (var i = 0; i < nodes.length; i++) {
      var nd = nodes[i], e;
      switch (nd.type) {
        case "text": parent.appendChild(doc.createTextNode(nd.text)); break;
        case "br": parent.appendChild(doc.createElement("br")); break;
        case "strong": e = el(doc, "strong"); renderInline(doc, nd.children, e); parent.appendChild(e); break;
        case "em": e = el(doc, "em"); renderInline(doc, nd.children, e); parent.appendChild(e); break;
        case "code": e = el(doc, "code", "am-md-code"); e.textContent = nd.text; parent.appendChild(e); break;
        case "link":
        case "chip": {
          var href = safeHref(nd.href); // çizimde yeniden doğrula (ağaç dışarıdan değiştirilmiş olabilir)
          // Bağlantı metni başka bir adres gibi görünüyorsa ve gerçek adresle eşleşmiyorsa (oltalama) bağlantı çizilmez, düz metin kalır.
          var shownText = nd.type === "chip" ? String(nd.text) : flatText(nd.children);
          var looksUrl = /(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|dev|app|tr|gov|edu|co|me|ai)\b/i.exec(shownText);
          var mismatch = !!(href && looksUrl && nd.type !== "chip" && href.toLowerCase().indexOf(looksUrl[0].toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "")) < 0);
          if (!href || mismatch) { parent.appendChild(doc.createTextNode(shownText)); break; }
          e = el(doc, "a", nd.type === "chip" ? "am-md-chip" : null);
          e.setAttribute("href", href);
          e.setAttribute("rel", "noopener noreferrer");
          e.setAttribute("target", "_blank");
          e.setAttribute("referrerpolicy", "no-referrer");
          e.setAttribute("title", href);
          if (nd.type === "chip") e.textContent = String(nd.text); else renderInline(doc, nd.children, e);
          parent.appendChild(e);
          break;
        }
        default: break;
      }
    }
  }
  function flatText(nodes) {
    var s = "";
    for (var i = 0; i < nodes.length; i++) {
      var nd = nodes[i];
      if (nd.type === "text" || nd.type === "code") s += nd.text;
      else if (nd.type === "chip") s += nd.text;
      else if (nd.type === "br") s += "\n";
      else if (nd.children) s += flatText(nd.children);
    }
    return s;
  }
  function renderList(doc, l, parent) {
    var e = el(doc, l.type, l.type === "ol" ? "am-md-ol" : "am-md-ul");
    if (l.type === "ol" && l.start !== 1 && l.start > 0) e.setAttribute("start", String(l.start));
    for (var i = 0; i < l.items.length; i++) {
      var li = doc.createElement("li");
      renderInline(doc, l.items[i].children, li);
      if (l.items[i].sub) renderList(doc, l.items[i].sub, li);
      e.appendChild(li);
    }
    parent.appendChild(e);
  }
  function renderBlocks(doc, blocks, parent, opts) {
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i], e;
      switch (b.type) {
        case "p": e = el(doc, "p", "am-md-p"); renderInline(doc, b.children, e); parent.appendChild(e); break;
        case "h": {
          var lv = b.level >= 1 && b.level <= 4 ? b.level : 4;
          e = el(doc, "h" + lv, "am-md-h" + lv);
          renderInline(doc, b.children, e);
          parent.appendChild(e);
          break;
        }
        case "hr": parent.appendChild(el(doc, "hr", "am-md-hr")); break;
        case "quote": e = el(doc, "blockquote", "am-md-quote"); renderBlocks(doc, b.children, e, opts); parent.appendChild(e); break;
        case "ul": case "ol": renderList(doc, b, parent); break;
        case "pre": {
          var wrap = doc.createElement("div");
          wrap.setAttribute("data-md", "codeblock");
          if (b.lang) {
            var lang = doc.createElement("span");
            lang.setAttribute("data-md", "lang");
            lang.textContent = b.lang; // dil etiketi yalnız metin
            wrap.appendChild(lang);
          }
          if (opts && typeof opts.onCopy === "function") {
            var btn = doc.createElement("button");
            btn.setAttribute("type", "button");
            btn.setAttribute("data-md", "copy");
            btn.setAttribute("aria-label", T("safe.md.copyAria"));
            btn.textContent = T("safe.md.copy");
            (function (codeText, cb) {
              btn.addEventListener("click", function () { try { cb(codeText); } catch (err) { /* kopyalama hatası çizimi bozmaz */ } });
            })(b.text, opts.onCopy);
            wrap.appendChild(btn);
          }
          var pre = el(doc, "pre", "am-md-pre");
          var code = doc.createElement("code");
          code.textContent = b.text;
          pre.appendChild(code);
          wrap.appendChild(pre);
          parent.appendChild(wrap);
          break;
        }
        case "table": {
          var t = el(doc, "table", "am-md-table");
          var thead = doc.createElement("thead"), hr = doc.createElement("tr");
          for (var h = 0; h < b.header.length; h++) {
            var th = doc.createElement("th");
            th.setAttribute("scope", "col");
            renderInline(doc, b.header[h], th);
            hr.appendChild(th);
          }
          thead.appendChild(hr);
          t.appendChild(thead);
          var tbody = doc.createElement("tbody");
          for (var r = 0; r < b.rows.length; r++) {
            var tr = doc.createElement("tr");
            for (var c = 0; c < b.rows[r].length; c++) {
              var td = doc.createElement("td");
              renderInline(doc, b.rows[r][c], td);
              tr.appendChild(td);
            }
            tbody.appendChild(tr);
          }
          t.appendChild(tbody);
          parent.appendChild(t);
          break;
        }
        default: break;
      }
    }
  }
  function render(text, opts) {
    var doc = window.document;
    var tree = parse(text);
    var frag = doc.createDocumentFragment();
    renderBlocks(doc, tree.children, frag, opts || {});
    if (tree.truncated) {
      var p = el(doc, "p", "am-md-p");
      p.textContent = T("safe.md.truncated", { n: "200.000" });
      frag.appendChild(p);
    }
    return frag;
  }

  window.AM_MD = Object.freeze({
    render: render,
    parse: parse,
    MAX_LEN: MAX_LEN,
    pure: Object.freeze({ parse: parse, parseInline: function (s) { return parseInline(String(s == null ? "" : s), 0, false); }, safeHref: safeHref })
  });

  // ================================================================ AM_STATUS
  // Grup eşlemesi. 'failed' kullanıcı kararı gerektirdiği için bekleyenlerdedir (arşivlenmişse çözülmüş);
  // 'unavailable' (Faz 11 alt oturum durumu) sessiz düşme olmasın diye bekleyenlerdedir; bilinmeyen durum 'waiting'e düşer.
  var GROUP = Object.freeze({
    pending: "waiting", awaiting_approval: "waiting", blocked: "waiting", failed: "waiting", unavailable: "waiting",
    running: "running", approved: "running",
    idle: "idle", created: "idle",
    succeeded: "resolved", done: "resolved", cancelled: "resolved", denied: "resolved"
  });
  var TERMINAL = Object.freeze({ succeeded: 1, done: 1, cancelled: 1, denied: 1, failed: 1, idle: 1, created: 1 });
  var LABEL = Object.freeze({
    pending: ["⏸", "warn"], awaiting_approval: ["!", "warn"], blocked: ["⏸", "bad"], failed: ["✕", "bad"],
    unavailable: ["!", "bad"], running: ["◐", "info"], approved: ["◐", "info"], idle: ["●", "muted"],
    created: ["●", "muted"], succeeded: ["✓", "ok"], done: ["✓", "ok"], cancelled: ["✕", "muted"], denied: ["✕", "muted"]
  });
  function normState(state) {
    if (typeof state !== "string") return "unknown";
    var s = state.trim().toLowerCase();
    return has(GROUP, s) ? s : "unknown";
  }
  function label(state) {
    var s = normState(state);
    if (s === "unknown") return { key: "status.unknown", shape: "?", tone: "warn" };
    return { key: "status." + s, shape: LABEL[s][0], tone: LABEL[s][1] };
  }
  function timeOf(v) {
    if (typeof v === "number" && isFinite(v)) return v;
    if (typeof v === "string" && v !== "") { var t = Date.parse(v); if (isFinite(t)) return t; }
    if (v instanceof Date && isFinite(v.getTime())) return v.getTime();
    return -Infinity;
  }
  function groupOf(topic) {
    var s = normState(topic.state);
    if (s === "unknown") return "waiting";
    if (topic.archived === true && has(TERMINAL, s)) return "resolved";
    return GROUP[s];
  }
  function group(topics) {
    var g = { waiting: [], running: [], idle: [], resolved: [] };
    if (!Array.isArray(topics)) return g;
    var tmp = { waiting: [], running: [], idle: [], resolved: [] };
    for (var i = 0; i < topics.length; i++) {
      var t = topics[i];
      if (!t || typeof t !== "object") continue;
      tmp[groupOf(t)].push({ t: t, at: timeOf(t.updatedAt), i: i });
    }
    for (var k in tmp) {
      if (!has(tmp, k)) continue;
      tmp[k].sort(function (a, b) { return a.at === b.at ? a.i - b.i : (b.at > a.at ? 1 : -1); });
      g[k] = tmp[k].map(function (x) { return x.t; });
    }
    return g;
  }
  window.AM_STATUS = Object.freeze({
    group: group,
    label: label,
    pure: Object.freeze({ group: group, label: label, groupOf: groupOf, normState: normState })
  });

  // ================================================================ AM_NAME
  var NAME_MAX = 60;
  function stripUnsafe(s, keepNewlines) {
    var out = "";
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (isInvisibleOrBidi(c)) continue;
      if (c === 0xDB40 && i + 1 < s.length) { // U+E0000–E007F etiket karakterleri (görünmez kaçakçılık)
        var lo = s.charCodeAt(i + 1);
        if (lo >= 0xDC00 && lo <= 0xDC7F) { i++; continue; }
      }
      if (isControl(c)) { out += keepNewlines && c === 0x0A ? "\n" : " "; continue; }
      out += s.charAt(i);
    }
    return out;
  }
  function clean(ad) {
    if (ad == null || (typeof ad !== "string" && typeof ad !== "number")) return "";
    var s = String(ad);
    try { s = s.normalize("NFKC"); } catch (e) { /* normalize yoksa ham metin */ }
    s = stripUnsafe(s, false);
    var parts = [], cur = "";
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (isSpace(ch)) { if (cur !== "") { parts.push(cur); cur = ""; } }
      else cur += ch;
    }
    if (cur !== "") parts.push(cur);
    s = parts.join(" ");
    var cps = Array.from(s);
    if (cps.length > NAME_MAX) s = cps.slice(0, NAME_MAX).join("").trim();
    return s;
  }
  var FAMILIES = ["opus", "sonnet", "haiku", "fable"];
  function isLetter(ch) { return ch !== "" && /\p{L}/u.test(ch); }
  function familiesIn(text) {
    var s = String(text == null ? "" : text).toLowerCase();
    var found = [];
    for (var f = 0; f < FAMILIES.length; f++) {
      var w = FAMILIES[f], from = 0;
      while (true) {
        var at = s.indexOf(w, from);
        if (at < 0) break;
        var before = at === 0 ? "" : Array.from(s.slice(Math.max(0, at - 2), at)).pop() || "";
        var after = Array.from(s.slice(at + w.length, at + w.length + 2))[0] || "";
        if (!isLetter(before) && !isLetter(after)) { found.push({ fam: w, at: at }); break; }
        from = at + 1;
      }
    }
    found.sort(function (a, b) { return a.at - b.at; });
    return found.map(function (x) { return x.fam; });
  }
  function modelMismatch(ad, model) {
    var nameFams = familiesIn(clean(ad));
    var modelFams = typeof model === "string" ? familiesIn(model) : [];
    var nameFamily = nameFams.length ? nameFams[0] : null;
    var modelFamily = modelFams.length === 1 ? modelFams[0] : null;
    if (!nameFamily) return { mismatch: false, nameFamily: null, modelFamily: modelFamily };
    var mismatch = nameFams.length > 1 || modelFamily === null || modelFamily !== nameFamily;
    return { mismatch: mismatch, nameFamily: nameFamily, modelFamily: modelFamily };
  }
  window.AM_NAME = Object.freeze({
    clean: clean,
    modelMismatch: modelMismatch,
    MAX: NAME_MAX,
    pure: Object.freeze({ clean: clean, modelMismatch: modelMismatch, familiesIn: familiesIn, stripUnsafe: stripUnsafe })
  });

  // ================================================================ AM_DIALOG
  var dlgSeq = 0;
  var current = null; // { finish, ... } — aynı anda tek pencere
  var MAX_FIELD = 2000;
  var MAX_TARGET = 16000; // hedef satırı (opts.targetMax ile) gönderilen metnin TAMAMINI göstermek için daha uzun olabilir (model yetenekleri: en çok 4000 karakter + en çok 5 adres)
  function fieldText(v, max) {
    var s = stripUnsafe(v == null ? "" : String(v), true);
    var lim = typeof max === "number" && max > MAX_FIELD && max <= MAX_TARGET ? max : MAX_FIELD;
    return s.length > lim ? s.slice(0, lim - 1) + "…" : s;
  }
  function confirm(opts) {
    var o = opts && typeof opts === "object" ? opts : {};
    if (current) current.finish(false);
    var doc = window.document;
    var root = doc && typeof doc.getElementById === "function" ? doc.getElementById("overlayRoot") : null;
    if (!root) return Promise.resolve(false); // kök yoksa güvenli varsayılan: iptal

    return new Promise(function (resolve) {
      var n = ++dlgSeq;
      var titleId = "am-dlg-title-" + n, descId = "am-dlg-desc-" + n;
      var prevFocus = doc.activeElement || null;
      var done = false;
      var downOnBackdrop = false;

      var overlay = doc.createElement("div");
      overlay.className = "am-overlay";
      overlay.setAttribute("data-owner", "dialog");

      var box = doc.createElement("div");
      box.className = "am-dialog";
      box.setAttribute("role", "alertdialog");
      box.setAttribute("aria-modal", "true");
      box.setAttribute("aria-labelledby", titleId);
      box.setAttribute("aria-describedby", descId);
      box.setAttribute("tabindex", "-1");

      var h = doc.createElement("h2");
      h.className = "am-dialog-title";
      h.setAttribute("id", titleId);
      h.textContent = fieldText(TX(o.title) || T("safe.dialog.title"));
      box.appendChild(h);

      var desc = doc.createElement("div");
      desc.className = "am-dialog-body";
      desc.setAttribute("id", descId);
      function row(labelKey, value, kind, max) {
        var p = doc.createElement("p");
        p.className = "am-dialog-row";
        p.setAttribute("data-row", kind);
        var lab = doc.createElement("span");
        lab.className = "am-dialog-label";
        lab.textContent = T(labelKey) + ": ";
        var val = doc.createElement("strong");
        val.className = "am-dialog-value";
        val.textContent = fieldText(value, max); // eylem/hedef veridir: çevrilmez, yalnız metin
        p.appendChild(lab);
        p.appendChild(val);
        desc.appendChild(p);
      }
      row("safe.dialog.action", o.action, "action");
      row("safe.dialog.target", o.target, "target", o.targetMax);
      if (o.detail != null && String(o.detail) !== "") {
        var dp = doc.createElement("p");
        dp.className = "am-dialog-row";
        dp.setAttribute("data-row", "detail");
        dp.textContent = fieldText(o.detail); // ajan metni çeviri anahtarı olarak yorumlanmaz (ham metin)
        desc.appendChild(dp);
      }
      box.appendChild(desc);

      var actions = doc.createElement("div");
      actions.className = "am-dialog-actions";
      var cancelBtn = doc.createElement("button");
      cancelBtn.setAttribute("type", "button");
      cancelBtn.className = "am-btn am-btn--ghost";
      cancelBtn.setAttribute("data-action", "cancel");
      cancelBtn.textContent = fieldText(TX(o.cancelLabel) || T("safe.dialog.cancel"));
      var okBtn = doc.createElement("button");
      okBtn.setAttribute("type", "button");
      okBtn.className = o.danger === true ? "am-btn am-btn--danger" : "am-btn am-btn--primary";
      okBtn.setAttribute("data-action", "confirm");
      okBtn.textContent = fieldText(TX(o.confirmLabel) || T("safe.dialog.confirm"));
      actions.appendChild(cancelBtn);
      actions.appendChild(okBtn);
      box.appendChild(actions);
      overlay.appendChild(box);

      var focusables = [cancelBtn, okBtn];

      function onKey(e) {
        if (done) return;
        if (e.key === "Escape" || e.key === "Esc") {
          if (e.preventDefault) e.preventDefault();
          if (e.stopPropagation) e.stopPropagation();
          finish(false);
          return;
        }
        if (e.key === "Tab") {
          var active = doc.activeElement;
          var idx = focusables.indexOf(active);
          if (e.preventDefault) e.preventDefault();
          var next;
          if (idx < 0) next = e.shiftKey ? focusables[focusables.length - 1] : focusables[0];
          else next = focusables[(idx + (e.shiftKey ? -1 : 1) + focusables.length) % focusables.length];
          next.focus();
        }
      }
      function onFocusIn(e) {
        if (done) return;
        var t = e && e.target;
        if (t && typeof overlay.contains === "function" && !overlay.contains(t)) {
          (o.danger === true ? cancelBtn : okBtn).focus();
        }
      }
      function onDown(e) { downOnBackdrop = !!e && e.target === overlay; }
      function onClick(e) {
        if (!done && e && e.target === overlay && downOnBackdrop) finish(false);
        downOnBackdrop = false;
      }
      function finish(value) {
        if (done) return;
        done = true;
        if (current && current.finish === finish) current = null;
        cancelBtn.disabled = true;
        okBtn.disabled = true;
        overlay.removeEventListener("keydown", onKey);
        overlay.removeEventListener("mousedown", onDown);
        overlay.removeEventListener("click", onClick);
        if (typeof doc.removeEventListener === "function") doc.removeEventListener("focusin", onFocusIn, true);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        try {
          if (prevFocus && typeof prevFocus.focus === "function" && prevFocus.isConnected !== false) prevFocus.focus();
        } catch (err) { /* odak geri verilemezse sessiz değil ama kritik de değil */ }
        resolve(value === true);
      }

      cancelBtn.addEventListener("click", function () { finish(false); });
      okBtn.addEventListener("click", function () { finish(true); });
      overlay.addEventListener("keydown", onKey);
      overlay.addEventListener("mousedown", onDown);
      overlay.addEventListener("click", onClick);
      if (typeof doc.addEventListener === "function") doc.addEventListener("focusin", onFocusIn, true);

      current = { finish: finish };
      root.appendChild(overlay);
      (o.danger === true ? cancelBtn : okBtn).focus(); // tehlikeli eylemde varsayılan odak İPTAL
    });
  }
  function close() { if (current) current.finish(false); }
  window.AM_DIALOG = Object.freeze({ confirm: confirm, close: close });
})(typeof window !== "undefined" ? window : this);
