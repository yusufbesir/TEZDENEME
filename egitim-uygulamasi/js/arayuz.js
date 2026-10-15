(function () {
  'use strict';

  var kok = document.getElementById('uygulama');
  var ust = document.getElementById('ust');
  var gezinti = document.getElementById('gezinti');
  var UI_ANAHTAR = 'adimadim.arayuz.v1';

  var kurslar = (window.ICERIK || []).slice();
  var durum = null;
  var ui = { tema: 'sistem', kurs: null, hedef: 30 };
  var gorunum = 'ana';

  // ---------- yardımcılar ----------
  function el(etiket, ozellik, cocuklar) {
    var e = document.createElement(etiket);
    if (ozellik) {
      Object.keys(ozellik).forEach(function (k) {
        var v = ozellik[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'sinif') e.className = v;
        else if (k === 'metin') e.textContent = v;
        else if (k === 'tikla') e.addEventListener('click', v);
        else e.setAttribute(k, v === true ? '' : String(v));
      });
    }
    (cocuklar || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  function temizle(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function karistir(dizi) {
    var a = dizi.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function bugun() {
    var d = new Date();
    var ay = d.getMonth() + 1, gun = d.getDate();
    return d.getFullYear() + '-' + (ay < 10 ? '0' : '') + ay + '-' + (gun < 10 ? '0' : '') + gun;
  }

  function gunFarki(a, b) {
    function p(s) { var x = String(s).split('-'); return Date.UTC(+x[0], +x[1] - 1, +x[2]); }
    return Math.round((p(a) - p(b)) / 86400000);
  }

  function sinir(n) { return Math.max(0, Math.min(100, n)); }

  function arayuzYukle() {
    try {
      var h = JSON.parse(localStorage.getItem(UI_ANAHTAR) || 'null');
      if (h && typeof h === 'object') {
        if (['sistem', 'acik', 'koyu'].indexOf(h.tema) >= 0) ui.tema = h.tema;
        if (typeof h.kurs === 'string') ui.kurs = h.kurs;
        if ([20, 30, 50].indexOf(h.hedef) >= 0) ui.hedef = h.hedef;
      }
    } catch (e) { /* yoksay */ }
  }
  function arayuzKaydet() {
    try { localStorage.setItem(UI_ANAHTAR, JSON.stringify(ui)); } catch (e) { /* yoksay */ }
  }
  function temaUygula() {
    if (ui.tema === 'sistem') document.documentElement.removeAttribute('data-tema');
    else document.documentElement.setAttribute('data-tema', ui.tema);
  }
  function durumKaydet() { try { Depo.kaydet(durum); } catch (e) { /* yoksay */ } }

  function dersKimlik(kurs, ders) { return kurs.id + ':' + ders.id; }

  function kartCoz(kartId) {
    var i = kartId.lastIndexOf('#');
    if (i < 0) return null;
    var dk = kartId.slice(0, i), idx = +kartId.slice(i + 1);
    for (var a = 0; a < kurslar.length; a++) {
      var k = kurslar[a];
      for (var b = 0; b < k.uniteler.length; b++) {
        var dersler = k.uniteler[b].dersler;
        for (var c = 0; c < dersler.length; c++) {
          if (dersKimlik(k, dersler[c]) === dk) {
            var al = dersler[c].alistirmalar[idx];
            return al ? { alistirma: al, ders: dersler[c] } : null;
          }
        }
      }
    }
    return null;
  }

  function seriGoster() {
    if (!durum.sonGun) return 0;
    return gunFarki(bugun(), durum.sonGun) <= 1 ? durum.seri : 0;
  }

  function odakla(h1) {
    if (h1) { h1.setAttribute('tabindex', '-1'); try { h1.focus({ preventScroll: false }); } catch (e) { h1.focus(); } }
    window.scrollTo(0, 0);
  }

  function gezintiCiz() {
    temizle(gezinti);
    [['ana', 'Ana sayfa'], ['tekrar', 'Tekrar'], ['ayar', 'Ayarlar']].forEach(function (g) {
      var b = el('button', { type: 'button', metin: g[1], tikla: function () { git(g[0]); } });
      if (gorunum === g[0]) b.setAttribute('aria-current', 'page');
      gezinti.appendChild(b);
    });
  }

  function git(ad) {
    gorunum = ad;
    ust.classList.toggle('gizli', ad === 'ders' || ad === 'tekrarOturum');
    gezintiCiz();
    temizle(kok);
    if (ad === 'ana') anaEkran();
    else if (ad === 'tekrar') tekrarEkran();
    else if (ad === 'ayar') ayarEkran();
  }

  function cubuk(oran, sinif) {
    var ic = el('div');
    ic.style.width = sinir(oran) + '%';
    return el('div', { sinif: 'cubuk ' + (sinif || ''), role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(sinir(oran)) }, [ic]);
  }

  // ---------- ana ekran ----------
  function anaEkran() {
    var e = el('div', { sinif: 'ekran' });
    var h1 = el('h1', { metin: 'Bugün ne öğrenelim?' });
    e.appendChild(h1);

    var sv = Motor.seviye(durum.xp);
    var bg = bugun();
    var gx = (durum.gunlukXp && durum.gunlukXp[bg]) || 0;

    e.appendChild(el('div', { sinif: 'istatistik' }, [
      el('div', { sinif: 'istat' }, [el('b', { metin: String(seriGoster()) }), el('span', { metin: 'gün seri' })]),
      el('div', { sinif: 'istat' }, [el('b', { metin: String(durum.xp) }), el('span', { metin: 'toplam XP' })]),
      el('div', { sinif: 'istat' }, [el('b', { metin: String(sv.no) }), el('span', { metin: 'seviye' })])
    ]));

    var oran = sv.oran <= 1 ? sv.oran * 100 : sv.oran;
    e.appendChild(el('div', { sinif: 'kart' }, [
      el('div', { sinif: 'cubuk-etiket' }, [el('span', { metin: 'Seviye ' + sv.no + ' ilerlemesi' }), el('span', { metin: sv.bu + ' / ' + sv.sonraki + ' XP' })]),
      cubuk(oran)
    ]));
    e.appendChild(el('div', { sinif: 'kart' }, [
      el('div', { sinif: 'cubuk-etiket' }, [el('span', { metin: 'Günlük hedef' }), el('span', { metin: Math.min(gx, ui.hedef) + ' / ' + ui.hedef + ' XP' + (gx >= ui.hedef ? ' - tamam!' : '') })]),
      cubuk(gx / ui.hedef * 100, 'hedef')
    ]));

    var bekleyen = Motor.tekrarBekleyen(durum, bg).filter(function (id) { return kartCoz(id); });
    var tb = el('button', {
      type: 'button', sinif: 'dugme tam' + (bekleyen.length ? '' : ' ikincil'), disabled: bekleyen.length ? null : true,
      metin: bekleyen.length ? 'Tekrar zamanı (' + bekleyen.length + ' kart)' : 'Tekrar zamanı: bekleyen kart yok',
      tikla: function () { tekrarBaslat(); }
    });
    e.appendChild(tb);

    if (!kurslar.length) {
      e.appendChild(el('p', { sinif: 'not', metin: 'Henüz kurs içeriği yüklenemedi.' }));
      kok.appendChild(e); odakla(h1); return;
    }
    var kurs = kurslar.filter(function (k) { return k.id === ui.kurs; })[0] || kurslar[0];
    ui.kurs = kurs.id;

    var sec = el('select', { id: 'kurs-sec' });
    kurslar.forEach(function (k) {
      var o = el('option', { value: k.id, metin: k.ad });
      if (k.id === kurs.id) o.selected = true;
      sec.appendChild(o);
    });
    sec.addEventListener('change', function () { ui.kurs = sec.value; arayuzKaydet(); git('ana'); });
    e.appendChild(el('div', { sinif: 'secici' }, [el('label', { 'for': 'kurs-sec', metin: 'Kurs' }), sec]));
    if (kurs.aciklama) e.appendChild(el('p', { sinif: 'not', metin: kurs.aciklama }));

    var siradakiBulundu = false;
    kurs.uniteler.forEach(function (u, ui_) {
      var liste = el('ol', { sinif: 'yol' });
      u.dersler.forEach(function (d, di) {
        var kimlik = dersKimlik(kurs, d);
        var bitti = !!(durum.tamamlanan && durum.tamamlanan[kimlik]);
        var sirada = !bitti && !siradakiBulundu;
        if (sirada) siradakiBulundu = true;
        var b = el('button', {
          type: 'button', sinif: 'ders-dugme' + (bitti ? ' bitti' : '') + (sirada ? ' siradaki' : ''),
          tikla: function () { dersBaslat(kurs, d); }
        }, [
          el('span', { sinif: 'no', 'aria-hidden': 'true', metin: bitti ? '✓' : String(di + 1) }),
          el('span', { sinif: 'ad', metin: d.ad }),
          el('span', { sinif: 'etiket', metin: bitti ? 'Tamamlandı' : (sirada ? 'Sıradaki' : 'Başla') })
        ]);
        liste.appendChild(el('li', null, [b]));
      });
      e.appendChild(el('section', { sinif: 'unite', 'aria-label': 'Ünite ' + (ui_ + 1) }, [
        el('h2', { metin: 'Ünite ' + (ui_ + 1) + ': ' + u.ad }), liste
      ]));
    });
    kok.appendChild(e);
    odakla(h1);
  }

  // ---------- alıştırma çözücü (ders ve tekrar paylaşır) ----------
  function dogruCevapMetni(a) {
    if (a.tur === 'secim' || a.tur === 'bosluk') return a.secenekler[a.dogru];
    if (a.tur === 'yaz') return a.cevaplar[0];
    if (a.tur === 'sirala') return a.dogru.join(' ');
    if (a.tur === 'eslestir') return a.ciftler.map(function (c) { return c[0] + ' = ' + c[1]; }).join('; ');
    return '';
  }

  // sor(kapsayici, alistirma, bitince(dogruMu))
  function sor(alan, a, bitince) {
    temizle(alan);
    var cevap = null;      // kullanıcı cevabı
    var kilit = false;
    var kontrolBtn = el('button', { type: 'button', sinif: 'dugme tam', metin: 'Kontrol et', disabled: true });
    var govde = el('div', { sinif: 'ekran' });
    var girdiAlani = el('div', { sinif: 'ekran' });
    var geri = el('div', { 'aria-live': 'polite' });

    var soruEl = el('p', { sinif: 'soru' });
    var turEtiket = { secim: 'Doğru seçeneği seç', bosluk: 'Boşluğu doldur', yaz: 'Yazarak cevapla', sirala: 'Doğru sıraya diz', eslestir: 'Eşleştir' }[a.tur] || '';
    if (a.tur === 'bosluk' && a.soru.indexOf('___') >= 0) {
      var parcalar = a.soru.split('___');
      soruEl.appendChild(document.createTextNode(parcalar[0]));
      var yer = el('span', { sinif: 'bosluk-yer', 'aria-label': 'boşluk', metin: '   ' });
      soruEl.appendChild(yer);
      soruEl.appendChild(document.createTextNode(parcalar.slice(1).join('___')));
      soruEl._yer = yer;
    } else {
      soruEl.textContent = a.soru;
    }
    govde.appendChild(el('p', { sinif: 'alan-etiket', metin: turEtiket }));
    govde.appendChild(soruEl);
    govde.appendChild(girdiAlani);
    govde.appendChild(geri);
    govde.appendChild(kontrolBtn);
    alan.appendChild(govde);

    var secenekDugmeleri = [];
    var kilitle = function () {
      kilit = true;
      girdiAlani.querySelectorAll('button, input').forEach(function (b) { b.disabled = true; });
    };

    if (a.tur === 'secim' || a.tur === 'bosluk') {
      var grup = el('div', { sinif: 'secenekler', role: 'group', 'aria-label': 'Seçenekler' });
      a.secenekler.forEach(function (s, i) {
        var b = el('button', { type: 'button', sinif: 'secenek', 'aria-pressed': 'false', metin: s });
        b.addEventListener('click', function () {
          if (kilit) return;
          cevap = i;
          secenekDugmeleri.forEach(function (x, j) { x.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
          if (soruEl._yer) soruEl._yer.textContent = s;
          kontrolBtn.disabled = false;
        });
        secenekDugmeleri.push(b);
        grup.appendChild(b);
      });
      girdiAlani.appendChild(grup);
    } else if (a.tur === 'yaz') {
      var girdi = el('input', { type: 'text', sinif: 'yaz-girdi', 'aria-label': 'Cevabın', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' });
      girdi.addEventListener('input', function () { cevap = girdi.value; kontrolBtn.disabled = !girdi.value.trim(); });
      girdi.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' && !kontrolBtn.disabled && !kilit) kontrol(); });
      girdiAlani.appendChild(girdi);
      setTimeout(function () { girdi.focus(); }, 0);
    } else if (a.tur === 'sirala') {
      var secilen = [];
      var cevapAlan = el('div', { sinif: 'cevap-alan', 'aria-label': 'Cevabın', role: 'group' });
      var banka = el('div', { sinif: 'banka', role: 'group', 'aria-label': 'Parçalar' });
      var cizSirala = function () {
        temizle(cevapAlan); temizle(banka);
        secilen.forEach(function (idx, sira) {
          cevapAlan.appendChild(el('button', {
            type: 'button', sinif: 'parca secili-parca', metin: a.kelimeler[idx], 'aria-label': a.kelimeler[idx] + ', kaldırmak için seç',
            tikla: function () { if (kilit) return; secilen.splice(sira, 1); guncelle(); }
          }));
        });
        a.kelimeler.forEach(function (w, idx) {
          var kullanildi = secilen.indexOf(idx) >= 0;
          banka.appendChild(el('button', {
            type: 'button', sinif: 'parca', metin: w, disabled: (kullanildi || kilit) ? true : null,
            tikla: function () { if (kilit) return; secilen.push(idx); guncelle(); }
          }));
        });
      };
      var guncelle = function () {
        cevap = secilen.map(function (i) { return a.kelimeler[i]; });
        kontrolBtn.disabled = secilen.length === 0;
        cizSirala();
        if (kilit) girdiAlani.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
      };
      girdiAlani.appendChild(el('p', { sinif: 'alan-etiket', metin: 'Cevabın' }));
      girdiAlani.appendChild(cevapAlan);
      girdiAlani.appendChild(el('p', { sinif: 'alan-etiket', metin: 'Parçalar' }));
      girdiAlani.appendChild(banka);
      cizSirala();
    } else if (a.tur === 'eslestir') {
      var eslesme = {};            // sol index -> sağ index
      var seciliSol = null;
      var sagSira = karistir(a.ciftler.map(function (_, i) { return i; }));
      var renkSol = {};            // sol -> renk no
      var sayac = 0;
      var izgara = el('div', { sinif: 'eslestir' });
      var cizEs = function () {
        temizle(izgara);
        var solK = el('div', { sinif: 'sutun', role: 'group', 'aria-label': 'Sol sütun' });
        var sagK = el('div', { sinif: 'sutun', role: 'group', 'aria-label': 'Sağ sütun' });
        var sagEslesen = {};
        Object.keys(eslesme).forEach(function (l) { sagEslesen[eslesme[l]] = +l; });
        a.ciftler.forEach(function (c, i) {
          var es = eslesme[i] !== undefined;
          var no = es ? renkSol[i] : 0;
          var b = el('button', {
            type: 'button', sinif: 'es-oge' + (es ? ' e' + ((no - 1) % 5 + 1) : ''),
            'aria-pressed': seciliSol === i ? 'true' : 'false', disabled: kilit ? true : null,
            tikla: function () {
              if (kilit) return;
              if (es) { delete eslesme[i]; seciliSol = null; }
              else seciliSol = (seciliSol === i) ? null : i;
              guncelEs();
            }
          }, [es ? el('span', { sinif: 'rozet', metin: no + '.' }) : null, el('span', { metin: c[0] })]);
          solK.appendChild(b);
        });
        sagSira.forEach(function (r) {
          var sl = sagEslesen[r];
          var es = sl !== undefined;
          var no = es ? renkSol[sl] : 0;
          sagK.appendChild(el('button', {
            type: 'button', sinif: 'es-oge' + (es ? ' e' + ((no - 1) % 5 + 1) : ''), disabled: kilit ? true : null,
            tikla: function () {
              if (kilit) return;
              if (es) { delete eslesme[sl]; seciliSol = null; }
              else if (seciliSol !== null) {
                eslesme[seciliSol] = r; sayac++; renkSol[seciliSol] = sayac; seciliSol = null;
              }
              guncelEs();
            }
          }, [es ? el('span', { sinif: 'rozet', metin: no + '.' }) : null, el('span', { metin: a.ciftler[r][1] })]));
        });
        izgara.appendChild(solK); izgara.appendChild(sagK);
      };
      var guncelEs = function () {
        var tam = Object.keys(eslesme).length === a.ciftler.length;
        cevap = tam ? a.ciftler.map(function (c, i) { return [c[0], a.ciftler[eslesme[i]][1]]; }) : null;
        kontrolBtn.disabled = !tam;
        cizEs();
      };
      girdiAlani.appendChild(el('p', { sinif: 'alan-etiket', metin: 'Önce soldan, sonra sağdan bir öğe seç. Eşleşmeyi kaldırmak için öğeye tekrar bas.' }));
      girdiAlani.appendChild(izgara);
      cizEs();
      var kilitleEs = kilitle;
      kilitle = function () { kilit = true; cizEs(); kilitleEs(); };
    }

    function kontrol() {
      if (kilit || kontrolBtn.disabled) return;
      var dogru = false;
      try { dogru = !!Motor.cevapDogruMu(a, cevap); } catch (e) { dogru = false; }
      kilitle();
      if (a.tur === 'secim' || a.tur === 'bosluk') {
        secenekDugmeleri[a.dogru].classList.add('dogru-isaret');
        if (!dogru && cevap !== null) secenekDugmeleri[cevap].classList.add('yanlis-isaret');
      }
      kontrolBtn.style.display = 'none';
      temizle(geri);
      var kutu = el('div', { sinif: 'geri-bildirim ' + (dogru ? 'dogru' : 'yanlis'), role: 'status' });
      kutu.appendChild(el('h2', { metin: dogru ? 'Doğru!' : 'Yanlış' }));
      if (!dogru) kutu.appendChild(el('p', { metin: 'Doğru cevap: ' + dogruCevapMetni(a) }));
      if (a.aciklama && !dogru) kutu.appendChild(el('p', { metin: a.aciklama }));
      var devam = el('button', { type: 'button', sinif: 'dugme tam', metin: 'Devam', tikla: function () { bitince(dogru); } });
      kutu.appendChild(devam);
      geri.appendChild(kutu);
      devam.focus();
    }
    kontrolBtn.addEventListener('click', kontrol);
  }

  // ---------- ders ----------
  function dersBaslat(kurs, ders) {
    var n = ders.alistirmalar.length;
    if (!n) return;
    var kimlik = dersKimlik(kurs, ders);
    var oturum = durum;           // kartIsle sonuçları ders bitene kadar bellekte
    var kuyruk = [];
    for (var i = 0; i < n; i++) kuyruk.push(i);
    var yanlislar = [];
    var dogruSayisi = 0;
    var adim = 0;
    var tekrarAsamasi = false;
    var enIleri = 0;

    gorunum = 'ders';
    ust.classList.add('gizli');
    temizle(kok);

    var cikBtn = el('button', { type: 'button', sinif: 'cik', metin: 'Çık', 'aria-label': 'Dersten çık', tikla: function () { git('ana'); } });
    var cubukAlan = el('div');
    var ustSatir = el('div', { sinif: 'ders-ust' }, [cikBtn, cubukAlan]);
    var baslik = el('h1', { metin: ders.ad, sinif: 'not', style: null });
    baslik.style.fontSize = '1rem';
    var asamaEl = el('div');
    var alan = el('div');
    var e = el('div', { sinif: 'ekran' }, [ustSatir, baslik, asamaEl, alan]);
    kok.appendChild(e);

    function ciz() {
      var toplamAdim = n + yanlislar.length;
      var oran = Math.max(enIleri, adim / toplamAdim * 100);
      enIleri = oran;
      temizle(cubukAlan); cubukAlan.appendChild(cubuk(oran));
      cubukAlan.style.flex = '1 1 auto'; ustSatir.lastChild.style.width = '100%';
      temizle(asamaEl);
      if (tekrarAsamasi) asamaEl.appendChild(el('p', { sinif: 'asama', metin: 'Yanlışları bir kez daha deneyelim' }));
      if (adim >= kuyruk.length) {
        if (!tekrarAsamasi && yanlislar.length) {
          tekrarAsamasi = true;
          kuyruk = yanlislar.slice();
          adim = 0;
          ciz();
          return;
        }
        bitir();
        return;
      }
      var idx = kuyruk[adim];
      sor(alan, ders.alistirmalar[idx], function (dogru) {
        if (!tekrarAsamasi) {
          oturum = Motor.kartIsle(oturum, kimlik + '#' + idx, dogru, bugun());
          if (dogru) dogruSayisi++; else yanlislar.push(idx);
        }
        adim++;
        ciz();
      });
    }

    function bitir() {
      var onceki = oturum;
      var seriOnce = seriGoster();
      var yeni = Motor.dersBitir(oturum, kimlik, dogruSayisi, n, bugun());
      durum = yeni;
      durumKaydet();
      ozetGoster(ders, dogruSayisi, n, yeni.xp - onceki.xp, yeni.seri, seriOnce);
    }
    ciz();
    odakla(null);
  }

  function ozetGoster(ders, dogru, toplam, kazanilan, seri, seriOnce) {
    gorunum = 'ozet';
    ust.classList.remove('gizli');
    gezintiCiz();
    temizle(kok);
    var h1 = el('h1', { metin: dogru === toplam ? 'Kusursuz ders!' : 'Ders tamamlandı!' });
    var sv = Motor.seviye(durum.xp);
    var e = el('div', { sinif: 'ekran ozet' }, [
      h1,
      el('p', { sinif: 'not', metin: ders.ad }),
      el('p', { sinif: 'buyuk', metin: '+' + kazanilan + ' XP' }),
      el('div', { sinif: 'ozet-izgara' }, [
        el('div', { sinif: 'istat' }, [el('b', { metin: dogru + ' / ' + toplam }), el('span', { metin: 'ilk denemede doğru' })]),
        el('div', { sinif: 'istat' }, [el('b', { metin: String(seri) }), el('span', { metin: seri > seriOnce ? 'gün seri (arttı)' : 'gün seri' })]),
        el('div', { sinif: 'istat' }, [el('b', { metin: String(durum.xp) }), el('span', { metin: 'toplam XP' })]),
        el('div', { sinif: 'istat' }, [el('b', { metin: String(sv.no) }), el('span', { metin: 'seviye' })])
      ]),
      el('button', { type: 'button', sinif: 'dugme tam', metin: 'Ana sayfaya dön', tikla: function () { git('ana'); } })
    ]);
    kok.appendChild(e);
    odakla(h1);
  }

  // ---------- tekrar ----------
  function tekrarEkran() {
    var e = el('div', { sinif: 'ekran' });
    var h1 = el('h1', { metin: 'Tekrar' });
    e.appendChild(h1);
    var bekleyen = Motor.tekrarBekleyen(durum, bugun()).filter(function (id) { return kartCoz(id); });
    var kartSayisi = Object.keys(durum.kartlar || {}).length;
    if (!bekleyen.length) {
      e.appendChild(el('div', { sinif: 'kart' }, [el('p', { metin: kartSayisi ? 'Şu an vadesi gelen kart yok. Daha sonra tekrar bak.' : 'Henüz tekrar edilecek kart yok. Bir ders tamamladığında kartlar burada birikir.' })]));
    } else {
      e.appendChild(el('div', { sinif: 'kart' }, [el('p', { metin: bekleyen.length + ' kartın tekrar zamanı geldi. Her oturumda en fazla 10 kart sorulur.' })]));
      e.appendChild(el('button', { type: 'button', sinif: 'dugme tam', metin: 'Tekrara başla', tikla: tekrarBaslat }));
    }
    kok.appendChild(e);
    odakla(h1);
  }

  function tekrarBaslat() {
    var liste = Motor.tekrarBekleyen(durum, bugun()).filter(function (id) { return kartCoz(id); }).slice(0, 10);
    if (!liste.length) { git('tekrar'); return; }
    gorunum = 'tekrarOturum';
    ust.classList.add('gizli');
    temizle(kok);
    var adim = 0, dogruSay = 0, oturum = durum, enIleri = 0;
    var cikBtn = el('button', { type: 'button', sinif: 'cik', metin: 'Çık', 'aria-label': 'Tekrardan çık', tikla: function () { durum = oturum; durumKaydet(); git('ana'); } });
    var cubukAlan = el('div', { sinif: 'cubuk-kap' });
    var ustSatir = el('div', { sinif: 'ders-ust' }, [cikBtn, cubukAlan]);
    var alan = el('div');
    kok.appendChild(el('div', { sinif: 'ekran' }, [ustSatir, el('h1', { metin: 'Tekrar zamanı', sinif: 'not' }), alan]));
    kok.querySelector('h1').style.fontSize = '1rem';

    function ciz() {
      enIleri = Math.max(enIleri, adim / liste.length * 100);
      temizle(cubukAlan); cubukAlan.appendChild(cubuk(enIleri));
      cubukAlan.style.flex = '1 1 auto';
      if (adim >= liste.length) {
        durum = oturum; durumKaydet();
        gorunum = 'ozet'; ust.classList.remove('gizli'); gezintiCiz(); temizle(kok);
        var h1 = el('h1', { metin: 'Tekrar bitti' });
        kok.appendChild(el('div', { sinif: 'ekran ozet' }, [
          h1,
          el('p', { sinif: 'buyuk', metin: dogruSay + ' / ' + liste.length }),
          el('p', { sinif: 'not', metin: 'Yanlış yaptığın kartlar yarın yeniden karşına çıkacak.' }),
          el('button', { type: 'button', sinif: 'dugme tam', metin: 'Ana sayfaya dön', tikla: function () { git('ana'); } })
        ]));
        odakla(h1);
        return;
      }
      var kartId = liste[adim];
      var k = kartCoz(kartId);
      sor(alan, k.alistirma, function (dogru) {
        oturum = Motor.kartIsle(oturum, kartId, dogru, bugun());
        if (dogru) dogruSay++;
        adim++;
        ciz();
      });
    }
    ciz();
  }

  // ---------- ayarlar ----------
  function ayarEkran() {
    var e = el('div', { sinif: 'ekran' });
    var h1 = el('h1', { metin: 'Ayarlar' });
    e.appendChild(h1);

    function segment(baslik, secenekler, mevcut, sec) {
      var grup = el('div', { sinif: 'segment', role: 'group', 'aria-label': baslik });
      secenekler.forEach(function (s) {
        grup.appendChild(el('button', {
          type: 'button', metin: s[1], 'aria-pressed': mevcut === s[0] ? 'true' : 'false',
          tikla: function () { sec(s[0]); git('ayar'); }
        }));
      });
      return el('div', { sinif: 'kart ayar-grup' }, [el('h2', { metin: baslik }), grup]);
    }
    e.appendChild(segment('Tema', [['sistem', 'Sistem'], ['acik', 'Açık'], ['koyu', 'Koyu']], ui.tema, function (v) { ui.tema = v; arayuzKaydet(); temaUygula(); }));
    e.appendChild(segment('Günlük hedef', [[20, '20 XP'], [30, '30 XP'], [50, '50 XP']], ui.hedef, function (v) { ui.hedef = v; arayuzKaydet(); }));

    var sifirAlan = el('div', { sinif: 'kart ayar-grup' });
    function sifirCiz(onayda) {
      temizle(sifirAlan);
      sifirAlan.appendChild(el('h2', { metin: 'İlerlemeyi sıfırla' }));
      sifirAlan.appendChild(el('p', { sinif: 'not', metin: 'XP, seri, tamamlanan dersler ve tekrar kartlarının hepsi silinir.' }));
      if (!onayda) {
        sifirAlan.appendChild(el('button', { type: 'button', sinif: 'dugme ikincil', metin: 'İlerlemeyi sıfırla...', tikla: function () { sifirCiz(true); } }));
      } else {
        var vazgec = el('button', { type: 'button', sinif: 'dugme ikincil', metin: 'Vazgeç', tikla: function () { sifirCiz(false); } });
        var onay = el('div', { sinif: 'onay', role: 'alertdialog', 'aria-label': 'Sıfırlama onayı' }, [
          el('p', { metin: 'Emin misin? Bu işlem geri alınamaz.' }),
          el('div', { sinif: 'satir' }, [
            el('button', { type: 'button', sinif: 'dugme tehlike', metin: 'Evet, her şeyi sıfırla', tikla: function () {
              try { Depo.sifirla(); } catch (x) { /* yoksay */ }
              try { durum = Depo.yukle(); } catch (x) { durum = Motor.yeniDurum(); }
              if (!durum) durum = Motor.yeniDurum();
              git('ana');
            } }),
            vazgec
          ])
        ]);
        sifirAlan.appendChild(onay);
        vazgec.focus();
      }
    }
    sifirCiz(false);
    e.appendChild(sifirAlan);
    kok.appendChild(e);
    odakla(h1);
  }

  // ---------- başlat ----------
  arayuzYukle();
  temaUygula();
  try { durum = Depo.yukle(); } catch (e) { durum = null; }
  if (!durum) durum = Motor.yeniDurum();
  git('ana');
})();
