# Eğitim uygulaması sözleşmesi (iki geliştirici paylaşır)

Ad: **Adım Adım** (özgün; Duolingo/Busuu içerik, ad, logo, görsel KOPYALANMAZ). Derleme yok, tek sayfa, çevrimdışı, harici ağ isteği yok. Türkçe arayüz.
İz etiketi: [İP:Barkod uygulaması eğitim programı#RbpmbB]

## Dosya sahipliği
- A (motor+içerik): `js/motor.js`, `js/depo.js`, `icerik/*.js`, `test/*.test.js`
- B (arayüz): `index.html`, `css/stil.css`, `js/arayuz.js`
Başkasının dosyasına dokunma. Testler: `node --test egitim-uygulamasi/test/`.

## Modül biçimi
Tüm js dosyaları UMD: `(function(k,f){if(typeof module==='object'&&module.exports)module.exports=f();else k.X=f()})(typeof self!=='undefined'?self:this,function(){...})`.
Global adlar: `Motor`, `Depo`. İçerik dosyaları `(window.ICERIK=window.ICERIK||[]).push(kurs)` yapar; Node'da `module.exports=kurs` da olmalı.

## İçerik şeması
```
kurs = { id, ad, aciklama, dil:'tr'|'en', uniteler:[ { id, ad, dersler:[ { id, ad, alistirmalar:[ ... ] } ] } ] }
alıştırma türleri (hepsinde tur, soru, aciklama? (yanlışta gösterilir)):
 {tur:'secim', soru, secenekler:[2-4 metin], dogru:index}
 {tur:'bosluk', soru:'Metin ___ metin', secenekler:[..], dogru:index}
 {tur:'yaz', soru, cevaplar:[kabul edilen metinler]}
 {tur:'sirala', soru, kelimeler:[karışık parçalar], dogru:[doğru sıra]}
 {tur:'eslestir', soru, ciftler:[[sol,sag],...3-5 çift]}
```
Her ders 8-10 alıştırma. Kurs id'leri: `ingilizce-1`, `html-1`, `css-1`, `js-1`.

## Motor API (Motor)
- `Motor.yeniDurum()` → `{xp:0, seri:0, enSeri:0, sonGun:null, kartlar:{}, tamamlanan:{}, gunlukXp:{}}`
- `Motor.seviye(xp)` → `{no, bu, sonraki, oran}` (her seviye bir öncekinden biraz fazla XP; mantık kodda, formül raporda yok)
- `Motor.dersBitir(durum, dersKimlik, dogruSayisi, toplam, bugun)` → yeni durum (saf fonksiyon; durumu değiştirme). XP = 10 + doğru*2, tam puana +5. Seri: bugün ya da dün çalıştıysa artar, boşluk varsa 1'e düşer. `bugun` 'YYYY-MM-DD' metni (tarih karşılaştırması kodla).
- `Motor.kartIsle(durum, kartId, dogruMu, bugun)` → yeni durum. Aralıklı tekrar (Leitner, 5 kutu): doğru → kutu+1 (aralıklar 1,2,4,8,16 gün), yanlış → kutu 1. Kart: `{kutu, sonraki}`.
- `Motor.tekrarBekleyen(durum, bugun)` → vadesi gelen kart id listesi (en eski önce).
- `Motor.cevapDogruMu(alistirma, cevap)` → bool. secim/bosluk: index; yaz: büyük/küçük harf ve boşluk duyarsız, Türkçe I/İ doğru; sirala: dizi; eslestir: `[[sol,sag],...]`.
- Kart kimliği: `dersKimlik + '#' + alistirmaIndex`.
## Depo API (Depo)
- `Depo.yukle()` → durum (bozuk/eksik veri varsa `Motor.yeniDurum()`), `Depo.kaydet(durum)`; hepsi try/catch; anahtar `adimadim.durum.v1`; `Depo.sifirla()`.
## Güvenlik
`innerHTML` ile kullanıcı/içerik metni basma; `textContent` kullan. Dış ağ yok. Kullanıcı verisi yalnızca localStorage.
