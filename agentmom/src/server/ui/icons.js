/*
 * Sahip: Haiku (arayüz simgeleri) [İP:AgentMom Faz 11, dilim 2]
 * yazan: [Claude#agentmom-faz11-dilim2]
 * Amaç: window.AM_ICON(ad, {size, title}) kod içinde createElementNS ile küçük
 *       çizgi (stroke) SVG simgeleri üretir. Dış kaynak, dize SVG ve görsel dosyası yok.
 * Kural kaynağı: docs/tasarim/masaustu-arayuz-sozlesmesi-faz11.md (güvenlik kuralları 1-2).
 * Değiştirme: yalnız sahibi (Haiku) ya da ana oturum; simgeler özgün çizimdir.
 * Yükleme sırasında DOM'a dokunmaz; yalnız çağrıldığında öğe üretir.
 * Bilinmeyen ad: görünür yedek simge (kare + çarpı); asla boş ya da hata değil.
 */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  // Her simge: [öğe adı, öznitelikler]. Yalnız path, circle, rect, line kullanılır.
  var DEFS = {
    "menu": [
      ["line", { x1: 4, y1: 7, x2: 20, y2: 7 }],
      ["line", { x1: 4, y1: 12, x2: 20, y2: 12 }],
      ["line", { x1: 4, y1: 17, x2: 20, y2: 17 }]
    ],
    "sidebar": [
      ["rect", { x: 3, y: 4, width: 18, height: 16, rx: 2 }],
      ["line", { x1: 9, y1: 4, x2: 9, y2: 20 }]
    ],
    "back": [
      ["path", { d: "M19 12H6" }],
      ["path", { d: "M11 7l-5 5 5 5" }]
    ],
    "forward": [
      ["path", { d: "M5 12h13" }],
      ["path", { d: "M13 7l5 5-5 5" }]
    ],
    "search": [
      ["circle", { cx: 11, cy: 11, r: 7 }],
      ["path", { d: "M20 20l-4-4" }]
    ],
    "plus": [
      ["path", { d: "M12 5v14" }],
      ["path", { d: "M5 12h14" }]
    ],
    "folder": [
      ["path", { d: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }]
    ],
    "folder-open": [
      ["path", { d: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2" }],
      ["path", { d: "M3 19l2.6-7.5h15.1L18.5 19z" }]
    ],
    "grid": [
      ["rect", { x: 4, y: 4, width: 6, height: 6, rx: 1 }],
      ["rect", { x: 14, y: 4, width: 6, height: 6, rx: 1 }],
      ["rect", { x: 4, y: 14, width: 6, height: 6, rx: 1 }],
      ["rect", { x: 14, y: 14, width: 6, height: 6, rx: 1 }]
    ],
    "clock": [
      ["circle", { cx: 12, cy: 12, r: 8 }],
      ["path", { d: "M12 8v4l3 2" }]
    ],
    "briefcase": [
      ["rect", { x: 3, y: 7, width: 18, height: 13, rx: 2 }],
      ["path", { d: "M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" }],
      ["line", { x1: 3, y1: 12, x2: 21, y2: 12 }]
    ],
    "spark": [
      ["path", { d: "M12 4l1.8 6.2L20 12l-6.2 1.8L12 20l-1.8-6.2L4 12l6.2-1.8z" }]
    ],
    "brain": [
      ["path", { d: "M9 4.5a3 3 0 0 0-3 3v.5a3 3 0 0 0-2 2.8A3 3 0 0 0 6 16a3 3 0 0 0 3 3.5V4.5z" }],
      ["path", { d: "M15 4.5a3 3 0 0 1 3 3v.5a3 3 0 0 1 2 2.8A3 3 0 0 1 18 16a3 3 0 0 1-3 3.5V4.5z" }]
    ],
    "book": [
      ["path", { d: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z" }],
      ["path", { d: "M4 19a2 2 0 0 1 2-2h13" }]
    ],
    "scan": [
      ["path", { d: "M4 8V6a2 2 0 0 1 2-2h2" }],
      ["path", { d: "M16 4h2a2 2 0 0 1 2 2v2" }],
      ["path", { d: "M20 16v2a2 2 0 0 1-2 2h-2" }],
      ["path", { d: "M8 20H6a2 2 0 0 1-2-2v-2" }],
      ["line", { x1: 4, y1: 12, x2: 20, y2: 12 }]
    ],
    "gear": [
      ["circle", { cx: 12, cy: 12, r: 7 }],
      ["circle", { cx: 12, cy: 12, r: 3 }],
      ["line", { x1: 12, y1: 2, x2: 12, y2: 5 }],
      ["line", { x1: 12, y1: 19, x2: 12, y2: 22 }],
      ["line", { x1: 2, y1: 12, x2: 5, y2: 12 }],
      ["line", { x1: 19, y1: 12, x2: 22, y2: 12 }],
      ["line", { x1: 4.9, y1: 4.9, x2: 7, y2: 7 }],
      ["line", { x1: 17, y1: 17, x2: 19.1, y2: 19.1 }],
      ["line", { x1: 19.1, y1: 4.9, x2: 17, y2: 7 }],
      ["line", { x1: 7, y1: 17, x2: 4.9, y2: 19.1 }]
    ],
    "user": [
      ["circle", { cx: 12, cy: 8, r: 4 }],
      ["path", { d: "M4 21a8 8 0 0 1 16 0" }]
    ],
    "send": [
      ["path", { d: "M21 3L10 14" }],
      ["path", { d: "M21 3l-7 18-4-7-7-4 18-7z" }]
    ],
    "stop": [
      ["rect", { x: 6, y: 6, width: 12, height: 12, rx: 2 }]
    ],
    "paperclip": [
      ["path", { d: "M20 11.5l-7.8 7.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.8 17a1.7 1.7 0 0 1-2.4-2.4L15 7.9" }]
    ],
    "mic": [
      ["rect", { x: 9, y: 3, width: 6, height: 11, rx: 3 }],
      ["path", { d: "M5 11a7 7 0 0 0 14 0" }],
      ["line", { x1: 12, y1: 18, x2: 12, y2: 21 }]
    ],
    "chevron-down": [
      ["path", { d: "M6 9l6 6 6-6" }]
    ],
    "chevron-right": [
      ["path", { d: "M9 6l6 6-6 6" }]
    ],
    "chevron-up": [
      ["path", { d: "M6 15l6-6 6 6" }]
    ],
    "chevron-left": [
      ["path", { d: "M15 6l-6 6 6 6" }]
    ],
    "check": [
      ["path", { d: "M5 12.5l4.5 4.5L19 7" }]
    ],
    "x": [
      ["path", { d: "M6 6l12 12" }],
      ["path", { d: "M18 6L6 18" }]
    ],
    "alert": [
      ["path", { d: "M12 3.5L2.5 20h19L12 3.5z" }],
      ["line", { x1: 12, y1: 10, x2: 12, y2: 14 }],
      ["line", { x1: 12, y1: 17, x2: 12, y2: 17.01 }]
    ],
    "info": [
      ["circle", { cx: 12, cy: 12, r: 9 }],
      ["line", { x1: 12, y1: 11, x2: 12, y2: 17 }],
      ["line", { x1: 12, y1: 7.5, x2: 12, y2: 7.51 }]
    ],
    "branch": [
      ["circle", { cx: 6, cy: 6, r: 2 }],
      ["circle", { cx: 6, cy: 18, r: 2 }],
      ["circle", { cx: 18, cy: 8, r: 2 }],
      ["path", { d: "M6 8v8" }],
      ["path", { d: "M18 10a6 6 0 0 1-6 6H6" }]
    ],
    "link": [
      ["path", { d: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" }],
      ["path", { d: "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" }]
    ],
    "copy": [
      ["rect", { x: 8, y: 8, width: 12, height: 12, rx: 2 }],
      ["path", { d: "M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" }]
    ],
    "retry": [
      ["path", { d: "M20 12a8 8 0 1 1-2.3-5.7" }],
      ["path", { d: "M20 4v4h-4" }]
    ],
    "edit": [
      ["path", { d: "M4 20h4L19 9l-4-4L4 16v4z" }],
      ["line", { x1: 13.5, y1: 6.5, x2: 17.5, y2: 10.5 }]
    ],
    "pin": [
      ["path", { d: "M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6z" }],
      ["line", { x1: 12, y1: 14, x2: 12, y2: 21 }]
    ],
    "archive": [
      ["rect", { x: 3, y: 4, width: 18, height: 4, rx: 1 }],
      ["path", { d: "M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" }],
      ["line", { x1: 10, y1: 12, x2: 14, y2: 12 }]
    ],
    "code": [
      ["path", { d: "M8 7l-5 5 5 5" }],
      ["path", { d: "M16 7l5 5-5 5" }],
      ["path", { d: "M14 4l-4 16" }]
    ],
    "chat": [
      ["path", { d: "M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" }]
    ],
    "spinner": [
      ["path", { d: "M12 4a8 8 0 1 1-8 8" }]
    ],
    "help": [
      ["circle", { cx: 12, cy: 12, r: 9 }],
      ["path", { d: "M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" }],
      ["line", { x1: 12, y1: 17, x2: 12, y2: 17.01 }]
    ],
    "keyboard": [
      ["rect", { x: 2, y: 6, width: 20, height: 12, rx: 2 }],
      ["line", { x1: 6, y1: 10, x2: 6, y2: 10 }],
      ["line", { x1: 10, y1: 10, x2: 10, y2: 10 }],
      ["line", { x1: 14, y1: 10, x2: 14, y2: 10 }],
      ["line", { x1: 18, y1: 10, x2: 18, y2: 10 }],
      ["line", { x1: 7, y1: 14, x2: 17, y2: 14 }]
    ],
    "shield": [
      ["path", { d: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" }]
    ],
    "database": [
      ["path", { d: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z" }],
      ["path", { d: "M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6" }],
      ["path", { d: "M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" }]
    ],
    "download": [
      ["path", { d: "M12 4v11" }],
      ["path", { d: "M7 10l5 5 5-5" }],
      ["line", { x1: 5, y1: 20, x2: 19, y2: 20 }]
    ],
    "upload": [
      ["path", { d: "M12 16V5" }],
      ["path", { d: "M7 10l5-5 5 5" }],
      ["line", { x1: 5, y1: 20, x2: 19, y2: 20 }]
    ],
    "power": [
      ["path", { d: "M12 3v8" }],
      ["path", { d: "M6.3 6.3a8 8 0 1 0 11.4 0" }]
    ],
    "globe": [
      ["circle", { cx: 12, cy: 12, r: 9 }],
      ["path", { d: "M3 12h18" }],
      ["path", { d: "M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" }]
    ],
    "list": [
      ["line", { x1: 9, y1: 6, x2: 20, y2: 6 }],
      ["line", { x1: 9, y1: 12, x2: 20, y2: 12 }],
      ["line", { x1: 9, y1: 18, x2: 20, y2: 18 }],
      ["line", { x1: 4, y1: 6, x2: 4, y2: 6 }],
      ["line", { x1: 4, y1: 12, x2: 4, y2: 12 }],
      ["line", { x1: 4, y1: 18, x2: 4, y2: 18 }]
    ],
    "diff": [
      ["rect", { x: 4, y: 3, width: 16, height: 18, rx: 2 }],
      ["path", { d: "M12 6v6" }],
      ["path", { d: "M9 9h6" }],
      ["path", { d: "M9 16h6" }]
    ],
    "dot": [
      ["circle", { cx: 12, cy: 12, r: 1.5 }]
    ],
    "expand": [
      ["path", { d: "M4 9V4h5" }],
      ["path", { d: "M20 9V4h-5" }],
      ["path", { d: "M4 15v5h5" }],
      ["path", { d: "M20 15v5h-5" }]
    ],
    "filter": [
      ["path", { d: "M3 5h18l-7 8v6l-4 2v-8L3 5z" }]
    ],
    "bell": [
      ["path", { d: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2z" }],
      ["path", { d: "M10 21a2 2 0 0 0 4 0" }]
    ],
    "tool": [
      ["path", { d: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z" }]
    ],
    "doc": [
      ["path", { d: "M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5z" }],
      ["path", { d: "M14 3v5h5" }]
    ],
    "external": [
      ["path", { d: "M14 4h6v6" }],
      ["path", { d: "M20 4l-9 9" }],
      ["path", { d: "M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" }]
    ]
  };

  // Bilinmeyen ad için görünür yedek: kare + çarpı.
  var FALLBACK = [
    ["rect", { x: 3, y: 3, width: 18, height: 18, rx: 3 }],
    ["path", { d: "M8 8l8 8" }],
    ["path", { d: "M16 8l-8 8" }]
  ];

  // Faz 11 eklemeleri (modüllerin istediği adlar): özgün çizimler + takma adlar.
  DEFS["cube"] = [["path", { d: "M12 3l8 4.5v9L12 21l-8-4.5v-9z" }], ["path", { d: "M4 7.5l8 4.5 8-4.5" }], ["line", { x1: 12, y1: 12, x2: 12, y2: 21 }]];
  DEFS["sparkles"] = [["path", { d: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" }], ["path", { d: "M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" }]];
  DEFS["moon"] = [["path", { d: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" }]];
  DEFS["sun"] = [["circle", { cx: 12, cy: 12, r: 4 }], ["line", { x1: 12, y1: 2.5, x2: 12, y2: 5 }], ["line", { x1: 12, y1: 19, x2: 12, y2: 21.5 }], ["line", { x1: 2.5, y1: 12, x2: 5, y2: 12 }], ["line", { x1: 19, y1: 12, x2: 21.5, y2: 12 }], ["line", { x1: 5.2, y1: 5.2, x2: 7, y2: 7 }], ["line", { x1: 17, y1: 17, x2: 18.8, y2: 18.8 }], ["line", { x1: 5.2, y1: 18.8, x2: 7, y2: 17 }], ["line", { x1: 17, y1: 7, x2: 18.8, y2: 5.2 }]];
  DEFS["monitor"] = [["rect", { x: 3, y: 4, width: 18, height: 12, rx: 2 }], ["line", { x1: 9, y1: 20, x2: 15, y2: 20 }], ["line", { x1: 12, y1: 16, x2: 12, y2: 20 }]];
  DEFS["chart"] = [["path", { d: "M4 4v16h16" }], ["path", { d: "M8 15l3.5-4.5 3 2.5L19 7" }]];
  DEFS["arrow-down"] = [["path", { d: "M12 5v14" }], ["path", { d: "M6 13l6 6 6-6" }]];
  DEFS["agents"] = [["circle", { cx: 12, cy: 12, r: 2.5 }], ["circle", { cx: 5.5, cy: 6, r: 1.8 }], ["circle", { cx: 18.5, cy: 6, r: 1.8 }], ["circle", { cx: 12, cy: 19, r: 1.8 }], ["line", { x1: 10.2, y1: 10.5, x2: 6.8, y2: 7.2 }], ["line", { x1: 13.8, y1: 10.5, x2: 17.2, y2: 7.2 }], ["line", { x1: 12, y1: 14.5, x2: 12, y2: 17.2 }]];
  var ALIAS = { "arrow-left": "back", "arrow-right": "forward", "close": "x", "chevron": "chevron-right", "collapse": "chevron-up", "refresh": "retry", "settings": "gear", "warning": "alert", "file": "doc" };
  Object.keys(ALIAS).forEach(function (k) { DEFS[k] = DEFS[ALIAS[k]]; });

  var NAMES = Object.freeze(Object.keys(DEFS));

  function clampSize(value) {
    if (typeof value === "number" && isFinite(value) && value >= 8 && value <= 64) {
      return Math.round(value);
    }
    return 16;
  }

  function setAttrs(el, attrs) {
    var keys = Object.keys(attrs);
    for (var i = 0; i < keys.length; i += 1) {
      el.setAttribute(keys[i], String(attrs[keys[i]]));
    }
  }

  function icon(name, opts) {
    var o = opts && typeof opts === "object" ? opts : {};
    var known = typeof name === "string" && Object.prototype.hasOwnProperty.call(DEFS, name);
    var parts = known ? DEFS[name] : FALLBACK;
    var size = clampSize(o.size);
    var title = typeof o.title === "string" ? o.title.replace(/\s+/g, " ").trim().slice(0, 200) : "";

    var svg = document.createElementNS(NS, "svg");
    setAttrs(svg, {
      viewBox: "0 0 24 24",
      width: size,
      height: size,
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 1.75,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      focusable: "false"
    });

    if (title) {
      svg.setAttribute("role", "img");
      var t = document.createElementNS(NS, "title");
      t.textContent = title;
      svg.appendChild(t);
    } else {
      svg.setAttribute("aria-hidden", "true");
    }

    for (var i = 0; i < parts.length; i += 1) {
      var el = document.createElementNS(NS, parts[i][0]);
      setAttrs(el, parts[i][1]);
      svg.appendChild(el);
    }
    return svg;
  }

  icon.names = NAMES;
  window.AM_ICON = icon;
})();
