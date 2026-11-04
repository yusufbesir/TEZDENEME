/*
 * Sahip: Sonnet (D3 sayfası: Beceriler) [İP:AgentMom Faz 11, D3]
 * yazan: [Claude#agentmom-d3-sayfalar-more]
 * Amaç: window.AM_PAGES.register("skills", ...) ile beceri KAYDI ve izin kapısı görünümü: ad, yaşam döngüsü aşaması, risk sınıfı.
 *   Veri YALNIZ AM.state.skills. Bu sayfa karar/onay düğmesi taşımaz; otomatik indirme ya da kurulum YAPILMAZ (kararlar API/yetki akışındadır).
 * Kural kaynağı: docs/tasarim/masaustu-arayuz-sozlesmesi-faz11.md (D3). Sunucu metni yalnız textContent. Saf mantık: window.AM_PAGE_SKILLS.pure.
 * Değiştirme: yalnız sahibi ya da ana oturum. Yükleme sırasında DOM'a dokunmaz.
 */
(function () {
  "use strict";

  if (!window.AM_PAGES || typeof window.AM_PAGES.register !== "function") {
    throw new Error("page-skills: AM_PAGES sayfa çerçevesi (pages.js) yüklenmemiş; Beceriler sayfası kaydedilemedi.");
  }
  if (typeof window.AM_REGISTER_TR !== "function" || typeof window.AM_T !== "function") {
    throw new Error("page-skills: strings.js (AM_REGISTER_TR/AM_T) yüklenmemiş.");
  }

  window.AM_REGISTER_TR("page-skills", {
    "page-skills.title": "Beceriler",
    "page-skills.group": "Yönetim",
    "page-skills.lead": "Becerilerin kaydı ve izin kapısı. Bir beceri yayına ancak altı aşamayı sırayla geçip kullanıcı onayı alırsa girer.",
    "page-skills.registryOnly": "Bu sayfa yalnız KAYIT ve izin kapısıdır. Otomatik indirme ya da kurulum YAPILMAZ; beceri kendiliğinden çalıştırılmaz.",
    "page-skills.noButtons": "Karar ve onay burada verilmez; onay ve yayın kararı API/yetki akışında yalnızca kullanıcıya aittir.",
    "page-skills.flowTitle": "Beceri yaşam döngüsü",
    "page-skills.flowLabel": "Beceri yaşam döngüsü: aday, araştırma, güvenlik, yalıtılmış test, onay, yayın",
    "page-skills.flowCount": "{n} beceri",
    "page-skills.stage.candidate": "Aday",
    "page-skills.stage.researching": "Araştırma",
    "page-skills.stage.security_review": "Güvenlik",
    "page-skills.stage.isolated_test": "Yalıtılmış test",
    "page-skills.stage.awaiting_approval": "Onay",
    "page-skills.stage.released": "Yayın",
    "page-skills.stage.rejected": "Reddedildi",
    "page-skills.stage.revoked": "Geri çekildi",
    "page-skills.stage.unknown": "Bilinmeyen aşama",
    "page-skills.stageOf": "Aşama {i}/{n}",
    "page-skills.stageEnded": "Süreç sona erdi",
    "page-skills.listTitle": "Beceri kayıtları",
    "page-skills.caption": "Beceri tablosu: ad, yaşam döngüsü aşaması ve risk sınıfı",
    "page-skills.col.name": "Ad",
    "page-skills.col.state": "Durum",
    "page-skills.col.progress": "Yaşam döngüsü",
    "page-skills.col.risk": "Risk sınıfı",
    "page-skills.risk.contained": "Kapsanmış",
    "page-skills.risk.privileged": "Ayrıcalıklı",
    "page-skills.risk.remote": "Uzak",
    "page-skills.risk.unknown": "Bilinmeyen risk",
    "page-skills.riskHint.contained": "Yalıtılmış çalışır",
    "page-skills.riskHint.privileged": "Ayrıcalık ister; onay şart",
    "page-skills.riskHint.remote": "Uzaktan erişim ister; onay şart",
    "page-skills.empty": "Beceri kaydı yok",
    "page-skills.emptyDetail": "Henüz kayıtlı beceri adayı yok. Aday kaydı API üzerinden yapılır.",
    "page-skills.errTitle": "Beceri listesi çizilemedi",
    "page-skills.errDetail": "Ayrıntı: {reason}",
    "page-skills.retry": "Yeniden dene",
    "page-skills.summary": "Toplam {n} kayıt · yayında {r} · onay bekleyen {a} · reddedilen ya da geri çekilen {x}",
    "page-skills.unnamed": "(adsız)"
  });

  var T = function (key, vars) { return window.AM_T(key, vars); };

  // ------------------------------------------------------------------ saf mantık
  var FLOW = ["candidate", "researching", "security_review", "isolated_test", "awaiting_approval", "released"];
  var ENDED = { rejected: true, revoked: true };
  var STATE_TONE = {
    candidate: { tone: "muted", icon: "dot" }, researching: { tone: "info", icon: "search" }, security_review: { tone: "info", icon: "shield" },
    isolated_test: { tone: "info", icon: "scan" }, awaiting_approval: { tone: "warn", icon: "clock" }, released: { tone: "ok", icon: "check" },
    rejected: { tone: "bad", icon: "x" }, revoked: { tone: "bad", icon: "x" }, unknown: { tone: "warn", icon: "alert" }
  };
  var RISK = { contained: { tone: "ok", icon: "check" }, privileged: { tone: "warn", icon: "alert" }, remote: { tone: "bad", icon: "alert" }, unknown: { tone: "info", icon: "info" } };

  function str(v, max) { return typeof v === "string" ? v.slice(0, max || 300) : v == null ? "" : String(v).slice(0, max || 300); }
  function stateKey(s) {
    var k = String(s == null ? "" : s).toLowerCase();
    return FLOW.indexOf(k) >= 0 || ENDED[k] === true ? k : "unknown";
  }
  function stateInfo(s) {
    var key = stateKey(s);
    return { key: key, tone: STATE_TONE[key].tone, icon: STATE_TONE[key].icon, labelKey: "page-skills.stage." + key, ended: ENDED[key] === true, index: FLOW.indexOf(key) };
  }
  function riskInfo(r) {
    var k = String(r == null ? "" : r).toLowerCase();
    var key = Object.prototype.hasOwnProperty.call(RISK, k) && k !== "unknown" ? k : "unknown";
    return { key: key, tone: RISK[key].tone, icon: RISK[key].icon, labelKey: "page-skills.risk." + key, hintKey: key === "unknown" ? "" : "page-skills.riskHint." + key };
  }
  function normSkills(list) {
    return (Array.isArray(list) ? list.slice(0, 500) : []).map(function (s) {
      var o = s && typeof s === "object" ? s : {};
      return { id: str(o.id, 64), name: str(o.name, 300), state: str(o.state, 40), riskClass: str(o.riskClass, 40) };
    });
  }
  function stageCounts(skills) {
    var c = {};
    FLOW.concat(["rejected", "revoked", "unknown"]).forEach(function (k) { c[k] = 0; });
    (skills || []).forEach(function (s) { c[stateKey(s.state)]++; });
    return c;
  }
  function summaryCounts(skills) {
    var c = stageCounts(skills);
    return { total: (skills || []).length, released: c.released, awaiting: c.awaiting_approval, ended: c.rejected + c.revoked };
  }
  function sortSkills(skills) {
    return (skills || []).map(function (s, i) { return { s: s, i: i }; }).sort(function (a, b) {
      var ia = stateInfo(a.s.state), ib = stateInfo(b.s.state);
      var ra = ia.ended ? 99 : ia.index < 0 ? 98 : ia.index, rb = ib.ended ? 99 : ib.index < 0 ? 98 : ib.index;
      return ra - rb || a.i - b.i;
    }).map(function (x) { return x.s; });
  }

  // ------------------------------------------------------------------ DOM
  var TONES = { ok: 1, warn: 1, bad: 1, info: 1, muted: 1 };
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = String(text);
    return e;
  }
  function icon(name, size) {
    try { if (typeof window.AM_ICON === "function") return window.AM_ICON(name, { size: size || 14 }); } catch (e) { /* simge yoksa metin yeter */ }
    return document.createTextNode("");
  }
  function chip(text, tone, iconName) {
    var t = TONES[tone] === 1 ? tone : "muted";
    var c = el("span", "am-more-chip am-more-chip--" + t);
    c.appendChild(icon(iconName, 12));
    c.appendChild(el("span", "am-more-chip-t", text));
    return c;
  }
  function stateCard(kind, title, detail, retry) {
    var c = el("div", "am-more-card am-more-card--" + (kind === "error" ? "error" : "empty"));
    c.setAttribute("role", kind === "error" ? "alert" : "status");
    c.appendChild(icon(kind === "error" ? "alert" : "info", 18));
    c.appendChild(el("p", "am-more-card-t", title));
    if (detail) c.appendChild(el("p", "am-more-card-d", detail));
    if (retry) { var b = el("button", "am-more-btn", T("page-skills.retry")); b.type = "button"; b.addEventListener("click", retry); c.appendChild(b); }
    return c;
  }
  function noteLine(iconName, text) {
    var n = el("p", "am-more-note");
    n.appendChild(icon(iconName, 16));
    n.appendChild(el("span", "am-more-note-t", text));
    return n;
  }

  function flowBar(counts) {
    var ol = el("ol", "am-more-flow");
    ol.setAttribute("aria-label", T("page-skills.flowLabel"));
    FLOW.forEach(function (k, i) {
      var li = el("li", "am-more-flow-step am-more-flow-step--" + STATE_TONE[k].tone);
      var n = counts[k] || 0;
      li.appendChild(el("span", "am-more-flow-i", i + 1));
      li.appendChild(el("span", "am-more-flow-l", T("page-skills.stage." + k)));
      li.appendChild(el("span", "am-more-flow-c", T("page-skills.flowCount", { n: n })));
      ol.appendChild(li);
    });
    return ol;
  }

  function miniFlow(info) {
    var w = el("span", "am-more-mini");
    if (info.ended) { w.appendChild(chip(T("page-skills.stageEnded"), "bad", "x")); return w; }
    if (info.index < 0) { w.appendChild(el("span", "am-more-dim", T("page-skills.stage.unknown"))); return w; }
    w.setAttribute("role", "img");
    w.setAttribute("aria-label", T("page-skills.stageOf", { i: info.index + 1, n: FLOW.length }));
    FLOW.forEach(function (k, i) {
      w.appendChild(el("span", "am-more-mini-d" + (i < info.index ? " am-more-mini-d--past" : i === info.index ? " am-more-mini-d--now" : "")));
    });
    return w;
  }

  function buildTable(skills) {
    var wrap = el("div", "am-more-tablewrap");
    wrap.setAttribute("role", "region");
    wrap.setAttribute("tabindex", "0");
    wrap.setAttribute("aria-label", T("page-skills.caption"));
    var t = el("table", "am-more-table");
    t.appendChild(el("caption", "am-more-sr", T("page-skills.caption")));
    var thead = el("thead"); var htr = el("tr");
    ["name", "state", "progress", "risk"].forEach(function (c) {
      var th = el("th", "am-more-th", T("page-skills.col." + c)); th.setAttribute("scope", "col"); htr.appendChild(th);
    });
    thead.appendChild(htr); t.appendChild(thead);
    var tb = el("tbody");
    sortSkills(skills).forEach(function (s) {
      var si = stateInfo(s.state); var ri = riskInfo(s.riskClass);
      var tr = el("tr", "am-more-row am-more-skillrow");
      var th = el("th", "am-more-td am-more-td--name", s.name || T("page-skills.unnamed")); th.setAttribute("scope", "row"); tr.appendChild(th);
      var tdS = el("td", "am-more-td");
      tdS.appendChild(chip(T(si.labelKey) + (si.key === "unknown" && s.state ? ": " + s.state : ""), si.tone, si.icon));
      tr.appendChild(tdS);
      var tdF = el("td", "am-more-td"); tdF.appendChild(miniFlow(si)); tr.appendChild(tdF);
      var tdR = el("td", "am-more-td");
      tdR.appendChild(chip(T(ri.labelKey) + (ri.key === "unknown" && s.riskClass ? ": " + s.riskClass : ""), ri.tone, ri.icon));
      if (ri.hintKey) tdR.appendChild(el("span", "am-more-evid", T(ri.hintKey)));
      tr.appendChild(tdR);
      tb.appendChild(tr);
    });
    t.appendChild(tb); wrap.appendChild(t);
    return wrap;
  }

  var S = { root: null, page: null };

  function draw(AM, root) {
    root.textContent = "";
    var skills = normSkills(AM && AM.state ? AM.state.skills : []);
    var page = el("section", "am-more-page");
    page.setAttribute("aria-labelledby", "am-more-sk-h");
    var h = el("h2", "am-more-h", T("page-skills.title")); h.setAttribute("id", "am-more-sk-h");
    page.appendChild(h);
    page.appendChild(el("p", "am-more-lead", T("page-skills.lead")));
    var notes = el("div", "am-more-notes");
    notes.appendChild(noteLine("shield", T("page-skills.registryOnly")));
    notes.appendChild(noteLine("info", T("page-skills.noButtons")));
    page.appendChild(notes);

    var flowSec = el("section", "am-more-sec");
    flowSec.setAttribute("aria-labelledby", "am-more-sk-f");
    var fh = el("h3", "am-more-h3", T("page-skills.flowTitle")); fh.setAttribute("id", "am-more-sk-f");
    flowSec.appendChild(fh);
    flowSec.appendChild(flowBar(stageCounts(skills)));
    page.appendChild(flowSec);

    var listSec = el("section", "am-more-sec");
    listSec.setAttribute("aria-labelledby", "am-more-sk-l");
    var lh = el("h3", "am-more-h3", T("page-skills.listTitle")); lh.setAttribute("id", "am-more-sk-l");
    listSec.appendChild(lh);
    if (!skills.length) {
      listSec.appendChild(stateCard("empty", T("page-skills.empty"), T("page-skills.emptyDetail"), null));
    } else {
      var sc = summaryCounts(skills);
      listSec.appendChild(el("p", "am-more-count", T("page-skills.summary", { n: sc.total, r: sc.released, a: sc.awaiting, x: sc.ended })));
      listSec.appendChild(buildTable(skills));
    }
    page.appendChild(listSec);
    root.appendChild(page);
    S.root = root; S.page = page;
  }

  // Sayfada girdi alanı yok; her durum değişiminde baştan çizmek en güvenlisi (eski içerik kalmaz).
  function render(AM, root) { draw(AM, root); }

  window.AM_PAGE_SKILLS = {
    render: render,
    pure: { FLOW: FLOW, stateKey: stateKey, stateInfo: stateInfo, riskInfo: riskInfo, normSkills: normSkills, stageCounts: stageCounts, summaryCounts: summaryCounts, sortSkills: sortSkills }
  };

  window.AM_PAGES.register("skills", {
    title: T("page-skills.title"),
    group: T("page-skills.group"),
    render: function (AM, root) {
      try { render(AM, root); } catch (e) {
        root.textContent = "";
        root.appendChild(stateCard("error", T("page-skills.errTitle"), T("page-skills.errDetail", { reason: str(e && e.message, 200) || "?" }), function () {
          try { render(AM, root); } catch (e2) { /* görünür hata kartı zaten çizildi */ }
        }));
      }
    }
  });
})();
