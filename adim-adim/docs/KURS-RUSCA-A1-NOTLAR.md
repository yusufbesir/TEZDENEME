# Rusça A1 kursu: notlar

Sahibi Yusuf (yusufbesir). Yazan: [Claude#dalga12]. Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

## Kurs

`rusca-1` (Rusça A1: Başlangıç), `lib/icerik/rusca_a1.dart`, ses dili `ru-RU`. 4 ünite x 3 ders (12 ders), ders başına 9-10 alıştırma (Dinle, Seçim, Boşluk, Yaz, Sırala, Eşleştir, İşaretle, Tablo; Soyle yok). Dilbilgisi ipuçları: 12 (ders başına 1).

1. Kiril alfabesi ve selamlaşma: tanıdık harfler (В, Н, Р, С, У), yeni harfler ve ь/ъ, selamlaşma ve nezaket.
2. Tanışma ve sayılar: tanışma ve şahıs zamirleri, sayılar 0-20, onluklar ve fiyat (рубль).
3. Dilbilgisi temelleri: cinsiyet ve çoğul (мой/моя/моё/мои), "olmak" yok ve есть / нет, 1. ve 2. çekim şimdiki zaman ve не.
4. Günlük hayat: soru sözcükleri ve в / на + Prepositiv, yiyecek ve sipariş (Akkusativ), saat, gün ve ay.

## Kiril yazı yaklaşımı (Korece/Japonca/Çince notlarıyla aynı çizgi)

- Her Rusça ifadenin yanında parantez içinde Latin harfli okunuş vardır: `Привет (privyEt)`. Vurgulu ünlü büyük harfle gösterilir. Okunuş yaklaşıktır (vurgusuz o "a", vurgusuz e/ya "i" gibi). Harf eşlemesi: ж j, ш ş, щ şç, ч ç, ц ts, х h, ы ı, э e, ю yu, я ya, ё yo, й y.
- Yaz alıştırmalarında Türkçe klavye yeter: cevap Latin okunuş, Türkçe ya da rakamdır; Kiril yazı da kabul edilir. İlk kabul edilen cevap her zaman Latin/Türkçe/rakamdır (ipucu ilk harf ve uzunluğu bundan üretir). Kiril yazı Seçim, Boşluk, Sırala, Eşleştir, Tablo ve İşaretle ile sunulur (Türkçe → Rusça yazdırma yok).
- Sözlük maddesi `kelime (okunuş)` biçimindedir; sözlükte "Oku" düğmesi parantez içini atıp Kirilce metni `ru-RU` ile okur.
- Dinle-yaz oyunu Latin olmayan yazılı dilleri dışarıda bırakır: `DinleYaz.latinMi('ru-RU')` yanlıştır (liste Latin dillerinin izin listesidir, değişmedi).
- Yazı tipi gömülmedi; Windows sistem yazı tipleri Kiril harflerini gösterir. Windows'ta ru-RU TTS ses paketi kurulu olmalıdır (Ayarlar > Zaman ve dil > Dil ve bölge > Rusça, "Metin okuma" işaretli).
- Telaffuz puanlama (Soyle) Kirili tanımaz; kursta Soyle olmadığı için `telaffuz.dart` değişmedi.

## Dokunulan kayıt noktaları

`lib/icerik/rusca_a1.dart` + `lib/icerik/icerik.dart`; `lib/sozluk/dil_tanimi.dart` (`ru`, `rusca`, `ru-RU`, `Rus.`); `lib/motor/ders_ogeleri.dart` `kursSesDili`; `lib/motor/ogrenme_yolu.dart`; `lib/ekranlar/sozluk_ekrani.dart` `kursKisaAd`; `lib/icerik/dilbilgisi_ipuclari.dart`; testler `icerik_test`, `dil_paketi_test`, `sozluk_test`, `dilbilgisi_ipucu_test`, `ders_ogeleri_test`, yeni `rusca_a1_test`.

## Kapsam dışı / emin olunamayanlar

- Fiil çekimi sözlüğü, görsel kelime ve senaryo tabloları Rusça için eklenmedi.
- Okunuşlar (özellikle vurgu ve vurgusuz ünlü indirgemesi) anadil konuşuru tarafından gözden geçirilmedi; 50-90 onluklarının okunuşu yazıma yakın yaklaşık gösterildi.
- Nesne hâli (Akkusativ) ve yer hâli (Prepositiv) yalnız A1 düzeyindeki yaygın örneklerle; "нет" + tamlanan hâli kalıp olarak verildi.
