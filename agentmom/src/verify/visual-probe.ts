// Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Görsel kalite kapısı (madde 51) için SAYFA İÇİNDE çalışan iki işlev. browser-worker.ts bunları Playwright'a verir; ikisi de kendi kendine yeter
// (dış kapsamdaki hiçbir adı kullanmaz, çünkü kaynak metni sayfaya serileştirilir) ve sayfada kod ÇALIŞTIRMAZ, yalnız okur.
//  - captureBuiltins: context.addInitScript ile sayfa betiklerinden ÖNCE çalışır; yerleşik işlevlerin/getter'ların özgün başvurularını (rastgele adlı, yapılandırılamaz, yazılamaz
//    bir pencere özelliğinde) yakalar.
//  - visualProbe: önce yakalanan başvuruları sayfanın şimdiki yerleşikleriyle karşılaştırır; biri ezilmişse (sayfa betiği ölçümü yanıltmaya çalışıyor) ölçüm yapmadan "tampered" döner
//    (kural testleri başarısız olur). Aksi halde ölçümde getComputedStyle / getBoundingClientRect / querySelectorAll için YAKALANAN başvuruları kullanır.
// Kurallar: overflow (yatay taşma yok), clipped-text (kırpılmış metin yok), font-size (en küçük görünür metin >= 11px), target-size (etkileşimli hedef >= 24x24 CSS px, WCAG 2.5.8),
// contrast (WCAG AA metin kontrastı), overlap (örtüşen etkileşimli öğe yok), images (kırık görüntü yok).
// SINIRLAR (kasıtlı): hiçbir piksel/estetik/hizalama/renk-uyumu yargısı yoktur; "güzel görünüyor" diye bir şey ölçülmez. Kontrast: arka plan resmi/gradyanı olan öğe ATLANIR ve atlanan sayısı
// raporlanır; worker, ilgili öğe olup hiçbiri ölçülemediğinde ya da atlananlar %50'yi aştığında kuralı "doğrulanamadı" (error) sayar. Opaklık (opacity), filtre, blend modu ve ::before/::after metinleri
// hesaba katılmaz. Hedef boyutu: WCAG'ın "aralık" istisnası uygulanmaz (yalnız satır içi bağlantı muaftır), yani WCAG'dan biraz daha katıdır. Örtüşme: z-sırası ve gizleyen katmanlar değerlendirilmez;
// yalnız kutular kesişir mi diye bakılır. Kırık görüntü: sayfanın erişemediği (engellenen dış) görüntüler de kırık sayılır. Gizli sayılanlar: display:none, visibility:hidden, boyutsuz, 1x1 px (sr-only)
// ve sayfa orijininin solunda/üstünde kalan öğeler. Bir sayfada en çok 5000 öğe taranır (fazlası atlandı sayılır). Yerleşik ezme denetimi tek tek öğe üzerindeki (örnek düzeyi) ezmeleri aramaz;
// onlar yakalanan başvurular üzerinden aşıldığı için ölçümü yanıltmaz (getComputedStyle / getBoundingClientRect / querySelectorAll).
declare const document: any;
declare const window: any;

export interface ProbeOptions {
  checks: string[];
  max: number;
  capName: string;
}

export interface ProbeCheck {
  // Değerlendirilen öğe sayısı, atlananlar (ölçülemeyenler) ve toplam ihlal sayısı; items en çok `max` ihlal metnidir.
  checked: number;
  skipped: number;
  total: number;
  items: string[];
}

export interface ProbeResult {
  checks: Record<string, ProbeCheck>;
  // Ezilmiş yerleşiklerin adları (boş değilse ölçüm yapılmamıştır).
  tampered: string[];
}

export function captureBuiltins(capName: string): void {
  const W: any = window;
  const gopd = W.Object.getOwnPropertyDescriptor;
  const freeze = W.Object.freeze;
  // Yakalama anında (sayfa betiklerinden ÖNCE) her başvuru BAĞLANMIŞ "çağır" işlevine çevrilir: ölçüm sırasında Function.prototype.call/apply/bind aranmaz,
  // dolayısıyla sayfa bunları ezse de bağlanmış işlevler etkilenmez. uncurry(f)(bu, ...args) === f.call(bu, ...args).
  const uncurry = W.Function.prototype.bind.bind(W.Function.prototype.call);
  const fns: any[] = [];
  const getters: any[] = [];
  const walk = (path: string[]): any => {
    let o: any = W;
    for (let i = 0; i < path.length; i++) {
      if (o === undefined || o === null) return undefined;
      o = o[path[i] as string];
    }
    return o;
  };
  const fn = (...paths: string[]): void => {
    for (let i = 0; i < paths.length; i++) {
      const path = (paths[i] as string).split(".");
      const f = walk(path);
      if (typeof f === "function") fns[fns.length] = freeze({ path: freeze(path), fn: f });
    }
  };
  const getter = (objPath: string, ...props: string[]): void => {
    const path = objPath.split(".");
    const o = walk(path);
    for (let i = 0; i < props.length; i++) {
      const d = o ? gopd(o, props[i]) : undefined;
      if (d && typeof d.get === "function") getters[getters.length] = freeze({ path: freeze(path), prop: props[i], fn: d.get });
    }
  };
  fn("getComputedStyle", "parseFloat", "parseInt", "String", "Map", "Object.getOwnPropertyDescriptor", "Math.pow", "Math.max", "Math.min", "Math.round", "Math.abs", "Function.prototype.call", "Function.prototype.apply", "Function.prototype.bind", "Object.freeze", "Object.defineProperty", "Object.prototype.hasOwnProperty", "String.prototype.toLowerCase", "isFinite");
  fn("Array.prototype.slice", "Array.prototype.map", "Array.prototype.filter", "Array.prototype.indexOf", "Array.prototype.join", "Array.prototype.push");
  fn("String.prototype.slice", "String.prototype.trim", "String.prototype.replace", "String.prototype.split", "String.prototype.endsWith", "RegExp.prototype.exec", "RegExp.prototype.test");
  fn("Map.prototype.get", "Map.prototype.set", "Number.prototype.toFixed");
  fn("Element.prototype.getBoundingClientRect", "Element.prototype.querySelectorAll", "Document.prototype.querySelectorAll", "Node.prototype.contains");
  getter("Element.prototype", "shadowRoot", "scrollWidth", "clientWidth", "scrollHeight", "clientHeight", "tagName", "id", "className");
  getter("Node.prototype", "textContent", "childNodes", "nodeType", "nodeValue", "parentElement");
  getter("HTMLImageElement.prototype", "naturalWidth", "complete", "loading");
  getter("HTMLInputElement.prototype", "type", "disabled", "labels");
  getter("NodeList.prototype", "length");
  getter("HTMLButtonElement.prototype", "disabled");
  getter("HTMLSelectElement.prototype", "disabled");
  getter("CSSStyleDeclaration.prototype", "display", "visibility", "color", "backgroundColor", "backgroundImage", "fontSize", "fontWeight", "overflowX", "overflowY", "pointerEvents");
  // Öğe özelliklerini doğrudan (el.scrollWidth) okumak yerine prototipten yakalanıp uncurry edilmiş getter'lar kullanılır: öğe düzeyinde defineProperty tuzakları etkisizdir.
  const g: any = {};
  const ug = (alias: string, objPath: string, prop: string): void => {
    const o = walk(objPath.split("."));
    const d = o ? gopd(o, prop) : undefined;
    if (d && typeof d.get === "function") g[alias] = uncurry(d.get);
  };
  ug("scrollWidth", "Element.prototype", "scrollWidth");
  ug("clientWidth", "Element.prototype", "clientWidth");
  ug("scrollHeight", "Element.prototype", "scrollHeight");
  ug("clientHeight", "Element.prototype", "clientHeight");
  ug("tagName", "Element.prototype", "tagName");
  ug("id", "Element.prototype", "id");
  ug("className", "Element.prototype", "className");
  ug("shadowRoot", "Element.prototype", "shadowRoot");
  ug("textContent", "Node.prototype", "textContent");
  ug("childNodes", "Node.prototype", "childNodes");
  ug("nodeType", "Node.prototype", "nodeType");
  ug("nodeValue", "Node.prototype", "nodeValue");
  ug("parentElement", "Node.prototype", "parentElement");
  ug("naturalWidth", "HTMLImageElement.prototype", "naturalWidth");
  ug("complete", "HTMLImageElement.prototype", "complete");
  ug("loading", "HTMLImageElement.prototype", "loading");
  ug("inputType", "HTMLInputElement.prototype", "type");
  ug("labels", "HTMLInputElement.prototype", "labels");
  ug("inputDisabled", "HTMLInputElement.prototype", "disabled");
  ug("buttonDisabled", "HTMLButtonElement.prototype", "disabled");
  ug("selectDisabled", "HTMLSelectElement.prototype", "disabled");
  const cap = freeze({
    g: freeze(g),
    hop: uncurry(W.Object.prototype.hasOwnProperty),
    lower: uncurry(W.String.prototype.toLowerCase),
    gopd,
    fns: freeze(fns),
    getters: freeze(getters),
    gcs: uncurry(W.getComputedStyle),
    gbr: uncurry(W.Element.prototype.getBoundingClientRect),
    eqsa: uncurry(W.Element.prototype.querySelectorAll),
    dqsa: uncurry(W.Document.prototype.querySelectorAll),
    contains: uncurry(W.Node.prototype.contains),
    slice: uncurry(W.Array.prototype.slice),
  });
  W.Object.defineProperty(W, capName, { value: cap, enumerable: false, writable: false, configurable: false });
}

export function visualProbe(opts: ProbeOptions): ProbeResult {
  const cap: any = window[opts.capName];
  // ---- yerleşik ezme denetimi (yalnız ilkel döngüler ve === kullanılır; ezilmiş olabilecek bir yerleşiği çağırmaz) ----
  const bad: string[] = [];
  const addBad = (n: string): void => {
    bad[bad.length] = n;
  };
  if (!cap) return { checks: {}, tampered: ["the built-in capture script did not run"] };
  const resolve = (path: string[]): any => {
    let o: any = window;
    for (let i = 0; i < path.length; i++) {
      if (o === undefined || o === null) return undefined;
      o = o[path[i] as string];
    }
    return o;
  };
  const name = (path: string[], prop?: string): string => {
    let s = "";
    for (let i = 0; i < path.length; i++) s = s + (i > 0 ? "." : "") + path[i];
    return prop ? s + "." + prop : s;
  };
  for (let i = 0; i < cap.fns.length; i++) {
    const e = cap.fns[i];
    if (resolve(e.path) !== e.fn) addBad(name(e.path));
  }
  for (let i = 0; i < cap.getters.length; i++) {
    const e = cap.getters[i];
    const o = resolve(e.path);
    const d = o ? cap.gopd(o, e.prop) : undefined;
    if (!d || d.get !== e.fn) addBad(name(e.path, e.prop));
  }
  if (bad.length > 0) return { checks: {}, tampered: bad };

  const MAX = opts.max;
  const MAX_ELEMENTS = 5000;
  const MAX_CONTROLS = 300;
  const MIN_FONT = 11;
  const MIN_TARGET = 24;
  const want = (c: string): boolean => opts.checks.indexOf(c) >= 0;
  const short = (s: string, n: number): string => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  const out: Record<string, ProbeCheck> = {};
  const slot = (n: string): ProbeCheck => (out[n] = out[n] ?? { checked: 0, skipped: 0, total: 0, items: [] });
  const report = (c: ProbeCheck, text: string): void => {
    c.total++;
    if (c.items.length < MAX) c.items.push(short(text, 220));
  };
  // Ölçüm yakalanan (özgün) başvurularla yapılır.
  const gcs = (el: any): any => cap.gcs(window, el);
  const rectOf = (el: any): any => cap.gbr(el);
  const within = (root: any, selector: string): any[] => cap.slice(cap.eqsa(root, selector));
  const anywhere = (selector: string): any[] => cap.slice(cap.dqsa(document, selector));
  const G = cap.g;
  const disabledOf = (el: any): boolean => {
    const t = G.tagName(el);
    return (t === "INPUT" && G.inputDisabled(el) === true) || (t === "BUTTON" && G.buttonDisabled(el) === true) || (t === "SELECT" && G.selectDisabled(el) === true);
  };

  // Öğe düzeyi tuzak denetimi: ölçülen özelliklerden biri öğenin KENDİ özelliğiyse (sayfa defineProperty ile sahte değer veriyor) ölçüm güvenilmezdir.
  // Shadow DOM (açık kök) ve çerçeve/gömülü içerik ölçüm dışında kalır: ilgili kurallar sessizce geçmez, "doğrulanamadı" sayılır.
  const MEASURED = ["scrollWidth", "clientWidth", "scrollHeight", "clientHeight", "tagName", "id", "className", "textContent", "childNodes", "nodeType", "nodeValue", "parentElement", "naturalWidth", "complete", "loading", "type", "disabled", "labels", "shadowRoot"];
  const trapped: string[] = [];
  let opaque = 0;
  const allEls: any[] = anywhere("*");
  allEls[allEls.length] = document.documentElement;
  for (let i = 0; i < allEls.length; i++) {
    const el = allEls[i];
    for (let k = 0; k < MEASURED.length; k++) {
      if (cap.hop(el, MEASURED[k])) {
        if (trapped.length < 6) trapped[trapped.length] = "element property " + MEASURED[k] + " (own property on " + cap.lower(G.tagName(el)) + ")";
        break;
      }
    }
    const t = G.tagName(el);
    if (G.shadowRoot(el) || t === "IFRAME" || t === "FRAME" || t === "OBJECT" || t === "EMBED") opaque++;
  }
  if (trapped.length > 0) return { checks: {}, tampered: trapped };

  const everything: any[] = document.body ? within(document.body, "*") : [];
  const els: any[] = everything.length > MAX_ELEMENTS ? everything.slice(0, MAX_ELEMENTS) : everything;
  const beyond = everything.length - els.length;

  const sel = (el: any): string => {
    let s: string = cap.lower(G.tagName(el));
    if (G.id(el)) s += "#" + String(G.id(el)).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 30);
    const cnv = G.className(el);
    const cn = typeof cnv === "string" ? cnv.trim() : "";
    if (cn) s += "." + cn.split(/\s+/).slice(0, 2).map((x: string) => x.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 25)).join(".");
    const txt = String(G.textContent(el) || "").trim().replace(/\s+/g, " ").slice(0, 24);
    if (txt) s += ' "' + txt + '"';
    return short(s, 100);
  };

  const visible = (el: any): boolean => {
    const cs = gcs(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.visibility === "collapse") return false;
    const r = rectOf(el);
    if (r.width <= 0 || r.height <= 0) return false;
    if (r.width <= 1 && r.height <= 1) return false;
    if (r.right <= 0 || r.bottom <= 0) return false;
    return true;
  };

  const ownText = (el: any): boolean => {
    const nodes = cap.slice(G.childNodes(el));
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (G.nodeType(n) === 3 && String(G.nodeValue(n)).trim().length > 0) return true;
    }
    return false;
  };

  const visibleCache = new Map<any, boolean>();
  const isVisible = (el: any): boolean => {
    let v = visibleCache.get(el);
    if (v === undefined) {
      v = visible(el);
      visibleCache.set(el, v);
    }
    return v;
  };

  // (a) yatay taşma
  if (want("overflow")) {
    const c = slot("overflow");
    const de = document.documentElement;
    c.checked = 1;
    const dsw = G.scrollWidth(de);
    const dcw = G.clientWidth(de);
    if (dsw > dcw + 1) {
      report(c, "document scrollWidth " + dsw + " > clientWidth " + dcw);
      let shown = 0;
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        if (shown >= 4) break;
        if (!isVisible(el)) continue;
        const r = rectOf(el);
        if (r.right <= dcw + 1) continue;
        let clipped = false;
        for (let p = G.parentElement(el); p && p !== document.body && p !== de; p = G.parentElement(p)) {
          if (gcs(p).overflowX !== "visible") {
            clipped = true;
            break;
          }
        }
        if (clipped) continue;
        c.items.push(short("culprit: " + sel(el) + " right edge " + Math.round(r.right) + "px", 220));
        shown++;
      }
    }
  }

  // (b) kırpılmış / taşan metin, (c) en küçük yazı boyutu, (e) kontrast: hepsi doğrudan metni olan görünür öğeler üzerinde
  const needText = want("clipped-text") || want("font-size") || want("contrast");
  if (needText) {
    const clippedC = want("clipped-text") ? slot("clipped-text") : null;
    const fontC = want("font-size") ? slot("font-size") : null;
    const contrastC = want("contrast") ? slot("contrast") : null;
    if (contrastC) contrastC.skipped += beyond;
    if (clippedC) clippedC.skipped += beyond;
    if (fontC) fontC.skipped += beyond;
    const channel = (v: number): number => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    };
    const lum = (c: number[]): number => 0.2126 * channel(c[0] as number) + 0.7152 * channel(c[1] as number) + 0.0722 * channel(c[2] as number);
    const parse = (s: string): number[] | null => {
      if (s === "transparent") return [0, 0, 0, 0];
      const m = /^rgba?\(([^)]*)\)$/.exec(s);
      if (!m) return null;
      const parts = String(m[1]).split(/[\s,/]+/).filter((x: string) => x.length > 0);
      if (parts.length < 3) return null;
      const nums = parts.map((x: string) => (x.endsWith("%") ? parseFloat(x) / 100 : parseFloat(x)));
      for (let i = 0; i < nums.length; i++) if (!isFinite(nums[i] as number)) return null;
      return [nums[0] as number, nums[1] as number, nums[2] as number, nums.length > 3 ? (nums[3] as number) : 1];
    };
    const over = (top: number[], below: number[]): number[] => {
      const a = top[3] as number;
      return [(top[0] as number) * a + (below[0] as number) * (1 - a), (top[1] as number) * a + (below[1] as number) * (1 - a), (top[2] as number) * a + (below[2] as number) * (1 - a)];
    };
    // Atasal zincirde saydam olmayan ilk arka plan rengi; arka plan resmi/gradyanı görülürse null (atlandı).
    const backdrop = (el: any): number[] | null => {
      const layers: number[][] = [];
      let base: number[] = [255, 255, 255];
      for (let cur = el; cur && G.nodeType(cur) === 1; cur = G.parentElement(cur)) {
        const cs = gcs(cur);
        if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
        const bg = parse(cs.backgroundColor);
        if (!bg) return null;
        if ((bg[3] as number) >= 0.999) {
          base = [bg[0] as number, bg[1] as number, bg[2] as number];
          break;
        }
        if ((bg[3] as number) > 0) layers.push(bg);
      }
      let result = base;
      for (let i = layers.length - 1; i >= 0; i--) result = over(layers[i] as number[], result);
      return result;
    };
    for (let k = 0; k < els.length; k++) {
      const el = els[k];
      if (!ownText(el) || !isVisible(el)) continue;
      const cs = gcs(el);
      if (fontC) {
        fontC.checked++;
        const fs = parseFloat(cs.fontSize);
        if (fs < MIN_FONT) report(fontC, sel(el) + " font-size " + fs + "px < " + MIN_FONT + "px");
      }
      if (clippedC) {
        clippedC.checked++;
        const xClip = cs.overflowX === "hidden" || cs.overflowX === "clip";
        const yClip = cs.overflowY === "hidden" || cs.overflowY === "clip";
        if (xClip && G.scrollWidth(el) > G.clientWidth(el) + 1) report(clippedC, sel(el) + " scrollWidth " + G.scrollWidth(el) + " > clientWidth " + G.clientWidth(el) + " (overflow-x " + cs.overflowX + ")");
        else if (yClip && G.scrollHeight(el) > G.clientHeight(el) + 1) report(clippedC, sel(el) + " scrollHeight " + G.scrollHeight(el) + " > clientHeight " + G.clientHeight(el) + " (overflow-y " + cs.overflowY + ")");
      }
      if (contrastC) {
        const fg = parse(cs.color);
        const bd = backdrop(el);
        if (!fg || !bd) {
          contrastC.skipped++;
          continue;
        }
        contrastC.checked++;
        const fgRgb = (fg[3] as number) < 0.999 ? over(fg, bd) : [fg[0] as number, fg[1] as number, fg[2] as number];
        const l1 = lum(fgRgb);
        const l2 = lum(bd);
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        const size = parseFloat(cs.fontSize);
        const weight = parseInt(cs.fontWeight, 10);
        const large = size >= 24 || (size >= 18.66 && weight >= 700);
        const need = large ? 3 : 4.5;
        if (ratio < need) report(contrastC, sel(el) + " contrast " + ratio.toFixed(2) + ":1 < " + need + ":1 (" + cs.color + " on rgb(" + bd.map((x: number) => Math.round(x)).join(", ") + "))");
      }
    }
  }

  // (d) hedef boyutu ve (f) örtüşme: etkileşimli öğeler
  if (want("target-size") || want("overlap")) {
    const raw: any[] = anywhere('button, a[href], input, select, [role="button"]');
    const controls: any[] = [];
    for (let i = 0; i < raw.length; i++) {
      const el = raw[i];
      if (G.tagName(el) === "INPUT" && cap.lower(String(G.inputType(el))) === "hidden") continue;
      if (disabledOf(el)) continue;
      if (!isVisible(el)) continue;
      controls.push(el);
    }
    if (want("target-size")) {
      const c = slot("target-size");
      for (let i = 0; i < controls.length; i++) {
        const el = controls[i];
        const cs = gcs(el);
        // Cümle içindeki satır içi bağlantı muaf: bağlantı satır içi ve üst öğenin metni bağlantı metninden uzun.
        if (G.tagName(el) === "A" && cs.display === "inline" && G.parentElement(el) && String(G.textContent(G.parentElement(el)) || "").trim().length > String(G.textContent(el) || "").trim().length) continue;
        c.checked++;
        let r = rectOf(el);
        // Onay kutusu / seçenek düğmesi: görünür etiketi tıklanabilir alanın parçasıdır.
        const type = G.tagName(el) === "INPUT" ? cap.lower(String(G.inputType(el))) : "";
        const lbls = type === "checkbox" || type === "radio" ? cap.slice(G.labels(el) || []) : [];
        if (lbls.length > 0 && isVisible(lbls[0])) {
          const lr = rectOf(lbls[0]);
          if (lr.width * lr.height > r.width * r.height) r = lr;
        }
        if (r.width < MIN_TARGET - 0.01 || r.height < MIN_TARGET - 0.01) report(c, sel(el) + " target " + Math.round(r.width * 10) / 10 + "x" + Math.round(r.height * 10) / 10 + "px < " + MIN_TARGET + "x" + MIN_TARGET + "px");
      }
    }
    if (want("overlap")) {
      const c = slot("overlap");
      const list = controls.filter((el: any) => gcs(el).pointerEvents !== "none");
      const use = list.length > MAX_CONTROLS ? list.slice(0, MAX_CONTROLS) : list;
      c.checked = use.length;
      c.skipped = list.length - use.length;
      const rects = use.map((el: any) => rectOf(el));
      for (let i = 0; i < use.length; i++) {
        for (let j = i + 1; j < use.length; j++) {
          if (cap.contains(use[i], use[j]) || cap.contains(use[j], use[i])) continue;
          const a = rects[i];
          const b = rects[j];
          const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (w > 1 && h > 1) report(c, sel(use[i]) + " overlaps " + sel(use[j]) + " (" + Math.round(w) + "x" + Math.round(h) + "px)");
        }
      }
    }
  }

  // (g) kırık görüntü
  if (want("images")) {
    const c = slot("images");
    const imgs = anywhere("img");
    for (let i = 0; i < imgs.length; i++) {
      const el = imgs[i];
      if (!isVisible(el)) continue;
      if (G.loading(el) === "lazy" && !G.complete(el)) {
        c.skipped++;
        continue;
      }
      c.checked++;
      if (!G.complete(el) || G.naturalWidth(el) === 0) report(c, sel(el) + " image did not load (naturalWidth " + G.naturalWidth(el) + ")");
    }
  }
  if (opaque > 0) {
    // Shadow DOM / çerçeve içeriği ölçülemez: istenen her kural "doğrulanamadı" olur (checked 0, skipped > 0), sessizce geçmez.
    for (let i = 0; i < opts.checks.length; i++) {
      const c = slot(opts.checks[i] as string);
      c.checked = 0;
      c.skipped = c.skipped + opaque;
      c.items.push("the page has " + opaque + " shadow root(s) or frame(s) whose content cannot be measured");
    }
  }
  return { checks: out, tampered: [] };
}
