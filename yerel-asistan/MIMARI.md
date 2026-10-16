# Pırıl: Yerel Asistan (Windows + Android)

[İP:Bluey projesi incelemesi#Tazzd6]

Pırıl, tamamen yerel çalışan bir kişisel asistandır. Bilgisayarda tek başına çalışır; telefon bağlanınca telefon bilgisayarı kontrol eder. Bluey'den (rbrown101010/bluey-by-riley) yalnızca fikir alınmıştır; kod ve karakter özgündür.

## Temel kurallar

- Dış ağa hiçbir veri gitmez. Ağ yalnızca (1) telefon ile bilgisayar arasındaki şifreli yerel bağlantı, (2) isteğe bağlı `127.0.0.1:11434` (yerel Ollama) içindir.
- Hesap, bulut, telemetri, otomatik güncelleme sunucusu yoktur.
- Bluey'deki şifresiz eşleşme açığı kapatılmıştır: tüm iletiler AES-256-GCM ile şifrelenir, anahtar eşleştirme kodundan türetilir.
- Hiçbir beceri dosya silmez. Riskli eylemler (ekranı kilitle, uzaktan fare/klavye) bilgisayarda açık onay ister.

## Katmanlar

| Katman | Klasör | Çalıştığı yer | Not |
|---|---|---|---|
| Çekirdek | `cekirdek/` | Bilgisayar ve telefon | Bağımlılıksız saf JS. Türkçe niyet ayrıştırma + beceriler. İşletim sistemi işleri `platform` bağdaştırıcısıyla yapılır. |
| Protokol | `protokol/` | Bilgisayar (sunucu), telefon (istemci) | WebCrypto + `ws`. Şifreli, tekrar saldırısına dayanıklı. |
| PC uygulaması | `pc/` | Windows | Electron, tepsi simgesi, karakter penceresi, PowerShell platform bağdaştırıcısı, NSIS kurulum/kaldırma, eski sürüm temizliği. |
| Arayüz | `arayuz/` | PC ve telefon (ortak) | Piksel karakter, sohbet, emek illüzyonu adım listesi. |
| Android | `android/` | Android | Capacitor ile aynı arayüzün APK'sı, ses tanıma eklentisi. |

## Çalışma modları

1. **Tek başına (bilgisayar):** Metin/ses → çekirdek → bilgisayar becerileri.
2. **Tek başına (telefon):** Telefonda yalnızca cihaz becerileri (saat, hesap, zamanlayıcı, not). `platform` boş olduğundan sistem becerileri "bu cihazda desteklenmiyor" der.
3. **Bağlı (telefon → bilgisayar):** Telefon komutu şifreli gönderir, bilgisayar çalıştırır, adım adım ilerleme ve yanıt telefona döner. Uzaktan işaret/tıklama/yazma, bilgisayarda "Uzaktan kontrole izin ver" anahtarı açıkken çalışır.

## Sözleşmeler (modüller bunlara uyar)

### Çekirdek: `cekirdek/asistan.js`

```js
// CommonJS. Bağımlılık yok.
async function calistir(metin, ctx) -> {
  yanit: string,                 // Türkçe, kısa
  adimlar: [{ etiket: string, durum: 'bitti' | 'hata' }],  // yalnızca GERÇEKTEN yapılan işler
  eylem: null | { tip: string, ...veri },                  // arayüze ipucu (ör. {tip:'sayac', saniye:300})
  niyet: string,                 // eşleşen beceri adı ya da 'bilinmiyor'
  riskli: boolean                // true ise çağıran, çalıştırmadan önce onay almalı (bkz. onayIste)
}
// ctx: {
//   simdi: () => Date,
//   depo: { oku(anahtar) -> any|undefined, yaz(anahtar, deger) },   // senkron, JSON'lanabilir
//   platform: { ...isteğe bağlı bağdaştırıcı },
//   onayIste: async (aciklama) -> boolean,   // riskli beceriler için; yoksa riskli beceri reddedilir
//   yerelLlm: isteğe bağlı async (metin) -> string | null,
//   kaynak: isteğe bağlı 'telefon' (komut telefondan geldi),
//   uzakKontrolAcik: isteğe bağlı () -> boolean (bilgisayarda "Uzaktan kontrole izin ver" açık mı)
// }
// platform bağdaştırıcısı (hepsi isteğe bağlı, async):
//   uygulamaAc(ad) ; urlAc(url) ; sesAyarla({mutlak?:0-100, fark?:-100..100}) ; sesKapatAc() ;
//   ekranGoruntusu() -> {yol} ; dosyaAra(sorgu, {en_cok}) -> [yol] ; panoOku() ; panoYaz(metin) ;
//   kilitle() ; sistemBilgisi() -> {pilYuzde?, sarjda?, bellekKullanimYuzde?, cpuAdi?}
```

Telefon sınırı: `ctx.kaynak === 'telefon'` iken `uzakKontrolGerekli: true` işaretli beceriler (pano oku/yaz, dosya ara) yalnızca `ctx.uzakKontrolAcik()` true ise çalışır; aksi halde "Bunun için bilgisayarda uzaktan kontrole izin verilmeli." denir. Uygulama açma telefondan da çalışır. İşlev yoksa ya da hata verirse "kapalı" sayılır.

Beceri biçimi (`cekirdek/beceriler/<ad>.js`): `{ ad, aciklama, ornekler:[...], riskli?:boolean, uzakKontrolGerekli?:boolean, eslestir(normMetin) -> null|slots|{slots,guven}, calistir(slots, ctx) -> {yanit, adimlar, eylem?} }`.
`cekirdek/beceriler/index.js` hepsini toplar. Türkçe normalleştirme (`cekirdek/turkce.js`): küçük harf (İ/ı doğru), aksan toleransı, sayı yazıdan rakama ("beş dakika" → 5).

### Protokol: `protokol/`

- Eşleştirme kodu: 32 bayt rastgele sır, `PIRIL-` önekli Base32 (okunur, 8'li gruplar). Bilgisayar gösterir; telefona elle girilir veya QR ile okutulur.
- Bağlantı: `ws://ip:port`. İstemci `{v:2,t:'merhaba',ri:<16B b64>,ek:<65B b64>}` (ek = tek kullanımlık ECDH P-256 açık anahtarı, raw) gönderir; sunucu `{v:2,t:'merhaba',rs:<16B b64>,ek:<65B b64>}` döner. Oturum anahtarları: `HKDF-SHA256(IKM = ecdh_ortak_sir || sir, salt = ri||rs||istemciEk||sunucuEk, info = 'piril-c2s'|'piril-s2c')` → iki ayrı AES-256-GCM anahtarı. Geçici özel anahtarlar yalnız bellekte tutulur ve türetmeden sonra atılır: eşleştirme kodu sonradan ele geçse bile eski kayıtlı oturumlar çözülemez (ileri gizlilik). Yalnızca `v:2`; `v:1` reddedilir (geriye uyumluluk yok).
- Zarf: `{v:2,n:<sayaç>,c:<b64 şifreli+etiket>}`. Nonce = 4 sıfır bayt + 8 bayt big-endian sayaç. Alıcı sayacın tam olarak son+1 olmasını ister; boşluk, tekrar ve geri sarma reddedilir ve alıcı kalıcı kapanır. Çözülemeyen zarfta bağlantı kapanır.
- Boyut sınırları: kimlik doğrulanana kadar ws çerçevesi en çok 1 KB (merhaba); doğrulanmış oturumda istemci→sunucu düz ileti en çok 256 KB. `ekran` (2 MB'a kadar) yalnızca sunucudan gider.
- Kimliksiz bağlantı koruması: kimliği kanıtlanmamış eşzamanlı bağlantı toplam 4, IP başına 2; aşılırsa `hata` bile gönderilmeden hemen kapatılır. Her yeni kimliksiz deneme bağlantı açılırken "hatalı deneme" sayılır, kimlik kanıtlanınca silinir; 5 hatalı denemede IP 60 sn kilitlenir. Kilit **yalnızca yeni kimliksiz denemeleri** engeller; kimliğini zaten kanıtlamış aktif oturumu etkilemez (kilitli IP'ye kimlik kanıtlayarak ayrıcalık tanınmaz, süre 60 sn sabittir). Kilit kayıt haritası en çok 1024 girişle sınırlıdır (eski kayıtlar temizlenir). Aynı günlük olayı saniyede en çok 5 kez yazılır.
- Sıralı işleme: doğrulanmış oturumdaki iletiler tek kuyrukta sırayla işlenir (biri bitmeden öbürü başlamaz); kuyruk en çok 32 ileti, aşılırsa `hata{kod:'mesgul'}`.
- Sunucu yönetimi: `sirDegistir(yeniSir?)` sırrı yeniler ve aktif oturumu düşürür (eski sırla el sıkışmakta olanlar da doğrulanamaz); `oturumuKes()`; `baglananIp()` (aktif oturumun IP'si ya da `null`).
- İleti türleri (şifreli JSON): `komut{id,metin}`, `ilerleme{id,etiket,durum}`, `yanit{id,yanit,adimlar,eylem}`, `onay{id,aciklama}`/`onaySonuc{id,tamam}`, `isaret{x,y}` (0..1), `tikla{x,y,dugme}`, `yaz{metin}`, `tus{tus}`, `ekranIste{}`/`ekran{jpg:b64,gen,yuk}`, `durum{uzakKontrol:boolean}`, `hata{kod,mesaj}`.
- Sunucu yalnızca kullanıcı "Telefon bağlantısı"nı açınca LAN arayüzünde dinler; kapalıyken hiç dinlemez.

### PC: `pc/`

- `main.js` (Electron), `preload.js` (yalnızca dar bir köprü), `platform/windows.js`: PowerShell yalnızca `execFile` + `-EncodedCommand`, kullanıcı girdisi komut metnine **asla** eklenmez (ortam değişkeni veya stdin ile geçer).
- `cekirdek-kopru.js`: ctx kurulumu, `komutCalistir` ve telefon işleyicisi (Electron'suz, testli). Telefondan gelen komutlara `kaynak:'telefon'` ve `uzakKontrolAcik` verilir. Yerel LLM (Ollama) ayarlarda `yerelLlm.etkin === true` ise bağlanır (varsayılan KAPALI; tepsi: "Yerel yapay zeka (Ollama) kullan"); kapalıyken hiç ağ isteği yapılmaz.
- `onay.js`: onay penceresi mantığı. Aynı anda tek onay; 45 sn zaman aşımı (dolunca reddedilir ve kilit serbest kalır); iş telefondan geldiyse pencerede yazar (IP ile); onay penceresi açıkken uzak girdi (isaret/tikla/yaz/tus) yok sayılır.
- `eslestirme.js` + tepsi: "Eşleştirme kodunu yenile…" (onaylı; yeni sır üretir, safeStorage ile kaydeder, sunucuda `sirDegistir` ile uygular ve aktif oturumu düşürür), "Bağlı telefonu kes" (`oturumuKes`), bağlı telefonun IP'si (`baglananIp`) tepsi menüsünde ve `piril:durum` içinde. Kod iletişim kutusunda uyarı: "Kodu kimseyle paylaşma; sızdıysa yenile." Sunucu bu işlevleri sunmuyorsa savunmacı davranılır (kes: yapılmaz; yenile: sunucu yeni sırla yeniden başlatılır).
- Uygulama kimlikleri TEK tabloda: çekirdekte kimlik listesi (`uygulama-ac.js` `KIMLIKLER`, 15 kimlik), PC'de kimlik → çalıştırılabilir tablosu (`platform/windows.js` `UYGULAMALAR`); test ikisinin birebir aynı olduğunu denetler. Başlat menüsünde yalnızca TAM ad eşleşmesi; tablo dışı kimlik reddedilir (serbest uygulama adı yok).
- PowerShell sınırları: aynı anda en çok 2 süreç (fazlası kuyrukta, kuyruk 32 ile sınırlı); uzak işlemler saniyede en çok 20 (aşılırsa reddedilir); uzak `yaz`/`tus` sıralı çalışır.
- `guvenlik.js`: file:// istekleri yalnızca uygulamanın kendi kaynak klasörleriyle (arayüz klasörü ve pc klasörü) sınırlıdır; dışı, UNC ve `..` ile çıkış reddedilir.
- Paketleme: `scripts/after-pack.js` Electron fuse'larını ayarlar (`@electron/fuses`): RunAsNode kapalı, EnableNodeOptionsEnvironmentVariable kapalı, EnableNodeCliInspectArguments kapalı, EnableEmbeddedAsarIntegrityValidation açık, OnlyLoadAppFromAsar açık.
- **Kod imzası YOKTUR.** exe ve kurulum dosyaları imzasızdır (Windows SmartScreen uyarı verebilir) ve yayıncı kimliği doğrulanamaz. Fuse'lar ve asar bütünlüğü, imzanın yerini TUTMAZ; yalnızca paketlenmiş uygulamanın kolay kurcalanmasını zorlaştırır.
- Eski sürüm temizliğinde `SHA256.txt` kurulum dosyalarıyla AYNI klasörde durur; bu yalnızca bütünlük/bozulma denetimidir, GÜVENLİK SINIRI DEĞİLDİR (klasöre yazabilen biri ikisini birlikte değiştirebilir; gerçek doğrulama imza ister).
- Kurulum klasik Windows düzeninde: NSIS kurulum exe'si, ayrı kaldırma exe'si, `%LOCALAPPDATA%\Programs\Pırıl`, ayarlar `%APPDATA%\Pırıl`. Güncellemede `temizlik.js` manifestle yalnız kendi eski sürüm dosyalarını geri dönüşüm kutusuna taşır (kalıcı silme yok, sembolik bağ izlenmez, kullanıcı verisine dokunmaz).

### Arayüz: emek illüzyonu

Her komutta çekirdeğin döndürdüğü `adimlar` ve protokolün `ilerleme` iletileri, gerçekten yapılan işleri sırayla gösterir ("Komut çözümleniyor", "Dosyalar aranıyor", "Sonuçlar sıralanıyor"). Uydurma adım ve yapay bekleme yoktur; anlık işlemlerde (ayar değiştirme) adım listesi gösterilmez.

## Karakter

"Pırıl": özgün, 16x16 piksel tarzında SVG; yumuşak turkuaz gövde, büyük gözler, durumlara göre (dinliyor, düşünüyor, çalışıyor, bitti, hata) değişen yüz. Bluey karakteri değildir.

### Android yedekleme ve kod saklama

`android/scripts/yamala.js` manifeste `android:allowBackup="false"`, `android:fullBackupContent="false"` ve tüm alanları dışlayan `res/xml/data_extraction_rules.xml` (`android:dataExtractionRules`) ekler; idempotenttir. Eşleştirme kodu cihazda saklanmaz: arayüz yalnızca bellekte tutar (`localStorage` yalnızca çekirdek deposu içindir), kod alanında `autocomplete/autocapitalize/autocorrect` kapalı, `spellcheck=false`.

## Yapılabilir / yapılamaz (bu depoda)

Bulut ortamında Android SDK ve Windows yoktur; APK ve exe **Yusuf'un bilgisayarında** derlenir (`pc/` ve `android/` içindeki komutlar). Çekirdek, protokol ve arayüz mantığı burada Node ile test edilir.
