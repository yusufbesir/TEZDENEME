'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dizin = path.join(__dirname, '..', 'icerik');
const dosyalar = fs.readdirSync(dizin).filter((d) => d.endsWith('.js')).sort();
const TURLER = ['secim', 'bosluk', 'yaz', 'sirala', 'eslestir'];
const dolu = (s) => typeof s === 'string' && s.trim().length > 0;

const kurslar = dosyalar.map((d) => ({ dosya: d, kurs: require(path.join(dizin, d)) }));

test('icerik/ dizininde en az bir kurs var', () => {
  assert.ok(kurslar.length >= 1);
});

test('kurs kimlikleri tekil ve dosya adıyla uyumlu', () => {
  const idler = new Set();
  for (const { dosya, kurs } of kurslar) {
    assert.ok(dolu(kurs.id), dosya + ': id yok');
    assert.equal(kurs.id + '.js', dosya, dosya + ': id dosya adıyla uyuşmuyor');
    assert.ok(!idler.has(kurs.id), 'yinelenen kurs id: ' + kurs.id);
    idler.add(kurs.id);
  }
});

for (const { dosya, kurs } of kurslar) {
  test(dosya + ': kurs üst alanları', () => {
    assert.ok(dolu(kurs.ad));
    assert.ok(dolu(kurs.aciklama));
    assert.ok(['tr', 'en'].includes(kurs.dil), 'dil tr/en olmalı');
    assert.ok(Array.isArray(kurs.uniteler) && kurs.uniteler.length > 0);
  });

  test(dosya + ': ünite ve ders kimlikleri tekil, ders başına 8-10 alıştırma', () => {
    const idler = new Set();
    const ekle = (id) => {
      assert.ok(dolu(id), 'boş id');
      assert.ok(!idler.has(id), 'yinelenen id: ' + id);
      idler.add(id);
    };
    for (const u of kurs.uniteler) {
      ekle(u.id);
      assert.ok(dolu(u.ad), u.id + ': ad yok');
      assert.ok(Array.isArray(u.dersler) && u.dersler.length > 0, u.id + ': ders yok');
      for (const d of u.dersler) {
        ekle(d.id);
        assert.ok(dolu(d.ad), d.id + ': ad yok');
        assert.ok(Array.isArray(d.alistirmalar), d.id + ': alistirmalar dizi değil');
        assert.ok(
          d.alistirmalar.length >= 8 && d.alistirmalar.length <= 10,
          d.id + ': alıştırma sayısı 8-10 olmalı, bulunan ' + d.alistirmalar.length
        );
      }
    }
  });

  test(dosya + ': alıştırmalar şemaya uyar', () => {
    for (const u of kurs.uniteler) {
      for (const d of u.dersler) {
        d.alistirmalar.forEach((a, i) => {
          const yer = d.id + '#' + i;
          assert.ok(TURLER.includes(a.tur), yer + ': geçersiz tur ' + a.tur);
          assert.ok(dolu(a.soru), yer + ': soru boş');
          if (a.aciklama !== undefined) assert.ok(dolu(a.aciklama), yer + ': aciklama boş');

          if (a.tur === 'secim' || a.tur === 'bosluk') {
            assert.ok(Array.isArray(a.secenekler), yer + ': secenekler dizi değil');
            assert.ok(a.secenekler.length >= 2 && a.secenekler.length <= 4, yer + ': 2-4 seçenek olmalı');
            assert.ok(a.secenekler.every(dolu), yer + ': boş seçenek');
            assert.equal(new Set(a.secenekler).size, a.secenekler.length, yer + ': yinelenen seçenek');
            assert.ok(Number.isInteger(a.dogru), yer + ': dogru tamsayı değil');
            assert.ok(a.dogru >= 0 && a.dogru < a.secenekler.length, yer + ': dogru sınır dışı');
            if (a.tur === 'bosluk') assert.ok(a.soru.includes('___'), yer + ': soruda ___ yok');
          } else if (a.tur === 'yaz') {
            assert.ok(Array.isArray(a.cevaplar) && a.cevaplar.length > 0, yer + ': cevaplar boş');
            assert.ok(a.cevaplar.every(dolu), yer + ': boş cevap');
          } else if (a.tur === 'sirala') {
            assert.ok(Array.isArray(a.kelimeler) && a.kelimeler.length >= 2, yer + ': kelimeler yetersiz');
            assert.ok(Array.isArray(a.dogru), yer + ': dogru dizi değil');
            assert.ok(a.kelimeler.every(dolu) && a.dogru.every(dolu), yer + ': boş parça');
            assert.deepEqual(
              [...a.kelimeler].sort(),
              [...a.dogru].sort(),
              yer + ': kelimeler doğru dizinin permütasyonu değil'
            );
          } else if (a.tur === 'eslestir') {
            assert.ok(Array.isArray(a.ciftler), yer + ': ciftler dizi değil');
            assert.ok(a.ciftler.length >= 3 && a.ciftler.length <= 5, yer + ': 3-5 çift olmalı');
            for (const c of a.ciftler) {
              assert.ok(Array.isArray(c) && c.length === 2 && c.every(dolu), yer + ': geçersiz çift');
            }
            const sol = a.ciftler.map((c) => c[0]);
            const sag = a.ciftler.map((c) => c[1]);
            assert.equal(new Set(sol).size, sol.length, yer + ': yinelenen sol');
            assert.equal(new Set(sag).size, sag.length, yer + ': yinelenen sağ');
          }
        });
      }
    }
  });
}

test('ingilizce-1: 5 ünite, 10 ders, 5 türün hepsi kullanılmış, her alıştırmada aciklama var', () => {
  const k = kurslar.find((x) => x.kurs.id === 'ingilizce-1');
  assert.ok(k, 'ingilizce-1 bulunamadı');
  assert.equal(k.kurs.uniteler.length, 5);
  const turler = new Set();
  for (const u of k.kurs.uniteler) {
    assert.equal(u.dersler.length, 2, u.id + ': 2 ders olmalı');
    for (const d of u.dersler) {
      for (const a of d.alistirmalar) {
        turler.add(a.tur);
        assert.ok(dolu(a.aciklama), d.id + ': aciklama eksik');
      }
    }
  }
  assert.deepEqual([...turler].sort(), [...TURLER].sort());
});
