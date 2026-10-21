'use strict';
// Türkçe normalleştirme: İ/ı doğru küçük harf, aksan toleransı, yazıyla sayı -> rakam.
// Bağımlılık yok.

const AKSAN = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u', 'é': 'e' };

const SAYI = {
  sifir: 0, bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9,
  on: 10, yirmi: 20, otuz: 30, kirk: 40, elli: 50, altmis: 60, yetmis: 70, seksen: 80, doksan: 90,
};

function kucukHarf(s) {
  return String(s == null ? '' : s).replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
}

function aksanSil(s) {
  return kucukHarf(s)
    .replace(/[çğıöşüâîûé]/g, (c) => AKSAN[c])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function sayiMi(s) {
  return /^\d+(\.\d+)?$/.test(String(s));
}

// tokens[i]'den başlayarak yazıyla yazılmış sayı öbeği okur. { deger, son } | null
function sayiKos(tokens, i) {
  let toplam = 0;
  let grp = 0;
  let j = i;
  let gordu = false;
  while (j < tokens.length) {
    const n = tokens[j].n;
    if (Object.prototype.hasOwnProperty.call(SAYI, n)) {
      const v = SAYI[n];
      if (v === 0) {
        if (gordu) break;
        gordu = true;
        j++;
        break;
      }
      const ok = v < 10 ? grp % 10 === 0 : grp % 100 === 0;
      if (!ok) break;
      grp += v;
    } else if (n === 'yuz') {
      if (grp === 0) grp = 100;
      else if (grp < 10) grp *= 100;
      else break;
    } else if (n === 'bin') {
      toplam += (grp || 1) * 1000;
      grp = 0;
    } else if (n === 'milyon') {
      toplam = ((toplam + grp) || 1) * 1e6;
      grp = 0;
    } else {
      break;
    }
    gordu = true;
    j++;
  }
  if (!gordu) return null;
  let deger = toplam + grp;
  if (j < tokens.length && tokens[j].n === 'bucuk') {
    deger += 0.5;
    j++;
  }
  return { deger, son: j };
}

// Ham metni belirteçlere böler. Her belirteç: { h: özgün yazım, o: küçük harf (aksanlı), n: normal (aksansız) }
function tokenla(ham) {
  const s = String(ham == null ? '' : ham)
    .normalize('NFC')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/(\d),(\d)/g, '$1.$2');
  const re = /\d{1,2}:\d{2}|\d+(?:\.\d+)?|\p{L}[\p{L}\d]*|[+\-*/()%^=]/gu;
  const ham_ = [];
  let m;
  while ((m = re.exec(s)) !== null) {
    const h = m[0];
    const o = kucukHarf(h);
    ham_.push({ h, o, n: aksanSil(o) });
  }
  const out = [];
  for (let i = 0; i < ham_.length;) {
    const r = sayiKos(ham_, i);
    if (r) {
      const parca = ham_.slice(i, r.son);
      out.push({
        h: parca.map((t) => t.h).join(' '),
        o: parca.map((t) => t.o).join(' '),
        n: String(r.deger),
      });
      i = r.son;
      continue;
    }
    const t = ham_[i];
    if (t.n === 'yarim') {
      out.push({ h: t.h, o: t.o, n: '0.5' });
    } else if (t.n === 'ceyrek') {
      out.push({ h: t.h, o: t.o, n: '0.25' });
    } else if (t.n === 'bucuk' && out.length && sayiMi(out[out.length - 1].n)) {
      const onceki = out[out.length - 1];
      onceki.n = String(Number(onceki.n) + 0.5);
      onceki.h += ' ' + t.h;
      onceki.o += ' ' + t.o;
    } else {
      out.push(t);
    }
    i++;
  }
  return out;
}

function normallestir(ham) {
  return tokenla(ham).map((t) => t.n).join(' ');
}

// Yalnızca sayıdan oluşan bir söyleyişi sayıya çevirir ("beş" -> 5, "yarım" -> 0.5); değilse NaN.
function sayiyaCevir(ham) {
  const t = tokenla(ham);
  if (t.length === 1 && sayiMi(t[0].n)) return Number(t[0].n);
  return NaN;
}

module.exports = { kucukHarf, aksanSil, tokenla, normallestir, sayiyaCevir, sayiMi };
