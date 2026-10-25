# Arapça A1 kursu: notlar

Sahibi Yusuf (yusufbesir). Yazan: [Claude#dalga13]. Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

## Kurs

`arapca-1` (Arapça A1: Başlangıç), `lib/icerik/arapca_a1.dart`, ses dili `ar-SA`, dil kodu `ar`, kısa ad `Ara.`. Modern Standart Arapça. 4 ünite x 3 ders (12 ders), ders başına 9-10 alıştırma (Dinle, Seçim, Boşluk, Yaz, Sırala, Eşleştir, İşaretle, Tablo; Söyle yok). Dilbilgisi ipuçları: 12 (ders başına 1).

1. Alfabe ve selamlaşma: harf şekilleri (başta/ortada/sonda, bitişen/bitişmeyen), kısa/uzun ünlüler ve harekeler, selamlaşma.
2. Tanışma, zamirler ve sayılar: اسمي / أنا من تركيا, أنا أنت هو هي نحن, sayılar 0-10 ve 20/30.
3. Dilbilgisi temelleri: müzekker/müennes ve ة, ال + güneş/ay harfleri + هذا/هذه, isim cümlesi + çoğul + sahiplik (ـي ـك ـه).
4. Günlük hayat: soru edatları (ما من أين هل كيف), basit fiil (أشرب آكل) ve yiyecek, aile ve saat.

## Sağdan sola (RTL) çözümü

- Karışık metin (Arapça + Latin okunuş + Türkçe) için Flutter'ın Unicode çift yönlü (bidi) algoritması yeterlidir: Arapça parçalar kendi içinde sağdan sola, parantez içindeki Latin okunuş soldan sağa sıralanır. Bunun düzeni bozmaması için içerikte Arapça sözcüğün hemen ardına "." konmaz (test denetler), soru işareti olarak Arapça "؟" kullanılır.
- Parça dizen bileşenler tek tek parçalardan oluştuğu için asıl sorun orada çıkar: Sırala'nın cevap satırı ve havuzu ile İşaretle'nin kelime satırı soldan sağa dizilirse Arapça cümle ters görünür. Küçük ortak yardımcı `lib/bilesenler/alistirma/yon.dart` (`sagdanSolaMi`, `parcaYonu`): parçalardan biri Arapça (RTL blok) ise `Wrap(textDirection: rtl)` kullanılır, değilse null (varsayılan yön). `sirala.dart` ve `isaretle.dart` değişti; Arapça içermeyen tüm mevcut dillerde görünüm birebir aynıdır (testle doğrulandı).
- Cevap listeleri mantıksal sırada kalır (ilk kelime listede ilktir); yalnız çizim yönü değişir.
- Kapsam dışı bırakılan: soru metnindeki İngilizce kelime balonu, Eşleştir/Tablo/Seçenek metinleri (düz `Text`, bidi algoritması yeterli).

## Yazı yaklaşımı

- Her Arapça ifadenin yanında parantez içinde Latin okunuş: `مرحبا (marhaban)`. Okunuş yaklaşıktır: aa/ii/uu uzun ünlü, ج = c, خ = h/kh, ع boğazdan "a" (harfi gösterilmez), غ = ğ, ق = q.
- Harekeler yalnız öğretici sözcüklerde (alfabe dersleri ve dilbilgisi notu) gösterilir; diğer her yerde harekesiz yazılır. Dinle `okunacak` metinleri harekesiz ve parantezsizdir.
- Yaz alıştırmalarında klavye gerekmez: ilk kabul edilen cevap Latin okunuş/Türkçe/rakamdır, Arapça yazı da kabul edilir (Türkçe → Arapça yazdırma yok).
- Sözlük maddesi `kelime (okunuş)`; "Oku" düğmesi parantez içini atıp Arapçayı `ar-SA` ile okur. Dinle-yaz oyunu Latin olmayan dilleri dışarıda bırakır (`DinleYaz.latinMi('ar-SA')` yanlış).
- Yazı tipi gömülmedi; Windows sistem yazı tipleri Arapça gösterir. Windows'ta ar-SA TTS ses paketi kurulu olmalıdır (Ayarlar > Zaman ve dil > Dil ve bölge > Arapça, "Metin okuma" işaretli).

## Dokunulan kayıt noktaları

`lib/icerik/arapca_a1.dart` + `lib/icerik/icerik.dart`; `lib/sozluk/dil_tanimi.dart` (`ar`, `arapca`, `ar-SA`, `Ara.`); `lib/motor/ders_ogeleri.dart` `kursSesDili`; `lib/motor/ogrenme_yolu.dart`; `lib/ekranlar/sozluk_ekrani.dart` `kursKisaAd`; `lib/icerik/dilbilgisi_ipuclari.dart`; RTL: `lib/bilesenler/alistirma/yon.dart`, `sirala.dart`, `isaretle.dart`; testler `icerik_test`, `dil_paketi_test`, `sozluk_test`, `dilbilgisi_ipucu_test`, `ders_ogeleri_test`, yeni `arapca_a1_test` (yön + 360x640 ölçek 1,5 taşma).

## Emin olunamayanlar

- Latin okunuşlar anadil konuşuru tarafından gözden geçirilmedi; ة'li sözcüklerin duraklı okunuşu ("a") ve ع/ء harfleri yaklaşık gösterildi (ثلاثة selaasa, أربعة arbaa gibi).
- Saat ifadesi yalnız 1-3 sıra sayılarıyla verildi (الساعة الواحدة ...); الساعة okunuşu "es-saa" yaklaşıktır.
- "3-10 arası sayılarda sayılan çoğul olur" ipucu genel kuraldır, ayrıntıya girilmedi. كتابك için kadına hitap (كتابكِ) kapsam dışı.
- TTS: ar-SA sesi harekesiz metni okur; sistem sesi sözcüğü bazen farklı vurgulayabilir.
