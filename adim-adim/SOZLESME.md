# Adım Adım — geliştirici sözleşmesi (Flutter)

Uygulama adı: **Adım Adım**. Türkçe arayüz. Çevrimdışı, harici ağ isteği yok, kullanıcı verisi yalnızca cihazda.
Platformlar: Android, iOS, Windows (ayrıca macOS/Linux). Flutter 3.35 / Dart 3.9. Paketler pubspec.yaml'da sabit; yeni paket ekleme.
İz etiketi: [İP:Adım Adım öğrenme uygulaması#Dwv81f]

Esin: Duolingo, Busuu, Drops, Memrise, TalkPal, LingoPanda, EF Hello, Mimo'dan yalnızca YÖNTEM alınır (kısa ders, yol, seri, aralıklı tekrar, anında geri bildirim, kod boşluğu). Ad, logo, maskot, görsel ve içerik KOPYALANMAZ.

## Dosya sahipliği (başkasının dosyasına dokunma)
- Koordinatör (hazır): `lib/model/icerik.dart`, `lib/model/durum.dart`, `lib/tema/renkler.dart`, bu dosya.
- A (motor+depo): `lib/motor/motor.dart`, `lib/depo/depo.dart`, `test/motor_test.dart`, `test/depo_test.dart`.
- B (içerik): `lib/icerik/*.dart`, `test/icerik_test.dart`.
- C (arayüz): `lib/main.dart`, `lib/uygulama.dart`, `lib/tema/tema.dart`, `lib/durum/*.dart`, `lib/ekranlar/*.dart`, `lib/bilesenler/*.dart`, `lib/servis/*.dart`, `test/arayuz_test.dart`, `assets/`.

Komutlar: `flutter analyze` (sıfır uyarı hedefi), `flutter test`.

## Model (hazır, lib/model)
- `Alistirma` sealed: `Secim`, `Bosluk`, `Yaz`, `Sirala`, `Eslestir`, `Dinle`, `Kod` (bkz. dosya). `Ders.kartKimligi(i)` = `dersId#i`.
- `Kurs{id, ad, aciklama, alan: KursAlani.dil|kod, uniteler}`, `Unite{id, ad, dersler}`, `Ders{id, ad, alistirmalar}`. Her ders 8-10 alıştırma.
- `OgrenciDurumu` immutable; `copyWith`, `toJson`, `fromJson` (bozuk veriyi varsayılana çeker, fırlatmaz). `Kart{kutu 1..5, sonraki 'YYYY-MM-DD'}`.

## A — Motor API (`lib/motor/motor.dart`, saf fonksiyonlar, Flutter'a bağımlı değil)
```dart
class Seviye { final int no; final int bu; final int sonraki; final double oran; }  // bu: seviye içindeki xp, sonraki: seviye için gereken, oran 0..1
abstract final class Motor {
  static String bugun([DateTime? simdi]);            // yerel saat, 'YYYY-MM-DD'
  static int gunFarki(String a, String b);           // b - a gün sayısı, kodla (DateTime.utc)
  static Seviye seviye(int xp);                      // eşik: seviye n için 100 + 25*(n-1) xp; xp<0 → 0 kabul; çok büyük xp'de döngü O(sqrt) ya da kapalı formül, donma yok
  static OgrenciDurumu dersBitir(OgrenciDurumu d, String dersId, int dogru, int toplam, String bugun);
      // xp += 10 + dogru*2 (+5 tam puan); gunlukXp[bugun] += aynı; tamamlanan[dersId]++;
      // seri: sonGun == bugun → değişmez; sonGun == bugun-1 → seri+1; aksi → 1; enSeri = max; sonGun = bugun
  static OgrenciDurumu kartIsle(OgrenciDurumu d, String kartId, bool dogruMu, String bugun);
      // Leitner 5 kutu, aralıklar [1,2,4,8,16] gün; doğru → kutu+1 (en çok 5), yanlış → kutu 1; sonraki = bugun + aralik[kutu-1]
  static List<String> tekrarBekleyen(OgrenciDurumu d, String bugun);   // sonraki <= bugun, en eski önce, sonra kimliğe göre
  static bool cevapDogruMu(Alistirma a, Object? cevap);
      // Secim/Bosluk/Dinle/Kod: int indeks; Yaz: String (büyük/küçük harf, baştaki/sondaki boşluk, çoklu boşluk, Türkçe I/İ/ı/i duyarsız; sondaki . ! ? yok sayılır); Sirala: List<String> tam eşit; Eslestir: List<({String sol,String sag})> sırası önemsiz, hepsi doğru çift olmalı
  static int dersXp(int dogru, int toplam);
}
```
Testler: her fonksiyon için sınır durumları (yanlış tip cevap → false, boş liste, seri sıfırlanması, yıl geçişi, xp çok büyük).

## A — Depo API (`lib/depo/depo.dart`)
```dart
abstract class Depo { Future<OgrenciDurumu> yukle(); Future<void> kaydet(OgrenciDurumu d); Future<void> sifirla(); }
class BellekDepo implements Depo { ... }                // testler ve önizleme için
class DosyaDepo implements Depo { DosyaDepo(Directory klasor); ... }
  // dosya: <klasor>/adimadim/durum.v1.json; yazma atomik (önce .tmp sonra rename); okuma: dosya yok/bozuk JSON/yanlış tip → OgrenciDurumu(); 2 MB üstü dosya → varsayılan; asla fırlatmaz
  // DosyaDepo.varsayilan(): path_provider getApplicationSupportDirectory() kullanır (Flutter gerekir; ayrı statik yapıcı)
```

## B — İçerik (`lib/icerik/`)
- `ingilizce_a1.dart` → `final Kurs ingilizceA1` (id `ingilizce-1`, alan dil): en az 4 ünite, 12 ders; eski sürümün 10 dersi taşınır ve genişletilir; her derste en az 1 `Dinle` alıştırması (okunacak İngilizce cümle, seçenekler İngilizce yazımlar).
- `html_1.dart`, `css_1.dart`, `js_1.dart` → `html1`, `css1`, `js1` (alan kod): eski sürümün 6'şar dersi taşınır; her derste en az 1 `Kod` alıştırması (`kod` içinde `___`).
- `icerik.dart` → `final List<Kurs> tumKurslar`, `Kurs? kursBul(String id)`.
- Kaynak: /tmp/claude-0/-home-claude-TEZDENEME/a7bebf22-1eff-5824-a689-494af342a61b/scratchpad/eski/egitim-uygulamasi/icerik/*.js (özgün içerik, önceki oturum yazdı; aynen aktarılabilir). Açıklamalar Türkçe, dil kurallarına uygun.
- `test/icerik_test.dart`: id'ler benzersiz, her ders 8-10 alıştırma, dogru indeksleri aralık içinde, Sirala.dogru ile kelimeler aynı küme, Eslestir 3-5 çift, Kod ve Bosluk sorularında `___` var, her kurs JSON gidiş-dönüşte eşit.

## C — Arayüz
- Riverpod (`flutter_riverpod`) + `go_router`. `lib/durum/saglayicilar.dart`: `depoProvider` (override edilebilir), `durumProvider` (AsyncNotifier<OgrenciDurumu>; `dersBitir`, `kartIsle`, `ayarGuncelle`, `sifirla`), `kurslarProvider`, `bugunProvider`.
- Tema `lib/tema/tema.dart`: `ThemeData acikTema()`, `koyuTema()`; `AdimRenkleri` extension eklenir; Material 3; yazı tipi: assets/fonts varsa Nunito (başlık) + Inter (gövde), yoksa sistem. Köşe yarıçapı 16, dokunma hedefi en az 48. Hiçbir bilgi yalnızca renkle verilmez (simge + metin).
- Ekranlar: `ana_sayfa.dart` (kurs seçimi + "basamak" yolu: üniteler ve dersler dikey basamaklar halinde, tamamlanan/sıradaki/kilitli; seri, günlük hedef halkası, tekrar bekleyen sayısı), `ders_ekrani.dart` (üstte ilerleme çubuğu, alıştırmayı göster, cevap → Motor.cevapDogruMu → alt banttan geri bildirim (dogru/hata rengi + simge + açıklama) → Devam; sonunda özet: doğru sayısı, kazanılan XP, seri), `tekrar_ekrani.dart` (tekrarBekleyen kartlarını sırayla sorar), `profil_ekrani.dart` (XP, seviye, en uzun seri, son 7 gün XP çubukları, tamamlanan ders sayısı), `ayarlar_ekrani.dart` (ad, tema açık/koyu/sistem, ses, günlük hedef, hatırlatma saati, verileri sıfırla (onay sorar)).
- Bileşenler: her alıştırma türü için widget (`bilesenler/alistirma/*.dart`), `geri_bildirim_bandi.dart`, `basamak.dart` (yol düğümü), `hedef_halkasi.dart`.
- `servis/ses.dart`: `Ses` sınıfı (flutter_tts sarmalayıcı; `oku(String metin, {String dil='en-US'})`, hata yutulur; testte sahte). `servis/bildirim.dart`: `Bildirim.gunlukHatirlatma(String 'HH:MM')` ve `iptal()`, flutter_local_notifications; başlatma hatası uygulamayı durdurmaz.
- Masaüstünde (genişlik ≥ 900) iki sütun (sol: yol, sağ: profil kartı); mobilde alt gezinme çubuğu (Yol, Tekrar, Profil, Ayarlar).
- Metinler Türkçe; kullanıcı metni asla kod/HTML olarak yorumlanmaz (Flutter'da Text kullan).
- `test/arayuz_test.dart`: BellekDepo ile uygulama açılır, bir ders akışı tamamlanır (doğru cevap → geri bildirim → özet), ayar değişikliği kalır.
