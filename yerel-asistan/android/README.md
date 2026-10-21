# Pırıl Android (Capacitor)

Aynı arayüzün (`../arayuz/`) APK'sı. Bu klasör APK'yı **burada derlemez**; derleme Yusuf'un Windows bilgisayarında yapılır (bulut ortamında Android SDK yok).

Ağ kuralı: uygulama yalnızca yerel ağdaki bilgisayara şifreli `ws://` ile bağlanır. Harici URL, bulut, telemetri yok.

## 1. Gereksinimler (Windows)

1. **Node.js 22 LTS veya üstü** (https://nodejs.org). Kurduktan sonra `node -v` ile kontrol edin.
2. **Android Studio** (https://developer.android.com/studio). İlk açılışta "Standard" kurulumu seçin; SDK ve JDK birlikte gelir.
3. Android Studio > More Actions > SDK Manager: **Android SDK Platform** (Capacitor 8 için güncel API düzeyi) ve **Command-line Tools** kurulu olsun.
4. Ortam değişkenleri (Başlat > "Ortam değişkenleri"):
   - `ANDROID_HOME` = `C:\Users\<kullanıcı>\AppData\Local\Android\Sdk`
   - `JAVA_HOME` = Android Studio'nun `jbr` klasörü (ör. `C:\Program Files\Android\Android Studio\jbr`)
   - Yeni bir PowerShell açın.

## 2. Kurulum adımları

PowerShell'de depo klasöründe:

```powershell
cd yerel-asistan\android
npm ci
node scripts\hazirla.js          # arayuz + cekirdek + protokol istemcisi -> www\
npx cap add android              # Android projesini üretir (bir kez)
```

> `npx cap add android`, Android projesini `yerel-asistan\android\android\` klasörüne üretir (`yamala.js` bu yolu varsayılan olarak kullanır).

### Yamalar (izinler + yerel ağ kuralı)

`cap add android` manifestte yalnızca `INTERNET` izni bırakır ve açık metin trafiğini sınırlamaz. Hazır yamalar `yamalar\` klasöründedir; tek komutla uygulanır (tekrar çalıştırmak güvenlidir):

```powershell
node scripts\yamala.js --ip 192.168.1.20
```

`--ip` bilgisayarınızın yerel IP adresidir (Pırıl PC uygulamasındaki "Telefon bağlantısı" ekranında yazar). Birden çok adres için virgülle ayırın: `--ip 192.168.1.20,10.0.0.5`. Yalnızca özel (192.168.x.x, 10.x.x.x, 172.16-31.x.x) adresler kabul edilir; başka bir adres verirseniz betik durur.

Betiğin yaptığı:

| Dosya | Değişiklik |
|---|---|
| `android\app\src\main\AndroidManifest.xml` | `RECORD_AUDIO`, `INTERNET`, `ACCESS_NETWORK_STATE` izinleri eklenir; `<application>` etiketine `android:networkSecurityConfig="@xml/network_security_config"` eklenir; varsa `usesCleartextTraffic="true"` `false` yapılır. |
| `android\app\src\main\res\xml\network_security_config.xml` | Açık metin (cleartext) varsayılan olarak **kapalı**. Yalnızca `localhost`, `10.0.2.2` (emülatör), `*.local` ve `--ip` ile verdiğiniz adreslere `ws://` izni verilir. |

**Önemli sınırlama:** Android'in ağ güvenlik yapılandırması IP aralığı (192.168.0.0/16 gibi) yazmaya izin vermez, yalnızca tek tek alan adı/IP yazılabilir. Bu yüzden PC'nizin adresini `--ip` ile eklemeniz gerekir. Adres değişirse betiği yeni adresle yeniden çalıştırıp APK'yı yeniden derleyin (öncekiler korunur). Yönlendiricinizde bilgisayara sabit (DHCP rezervasyonu) adres vermeniz önerilir. Ayrıca arayüz kodu, ws adresinin yerel/özel aralıkta olduğunu kendisi de doğrular.

Elle yapmak isterseniz: `yamalar\izinler.txt` içindeki izinleri manifeste ekleyin, `yamalar\network_security_config.xml` dosyasını `res\xml\` altına kopyalayın ve `<application>` etiketine yukarıdaki özniteliği ekleyin.

### Eşitleme ve derleme

```powershell
npx cap sync android             # www\ içeriğini ve eklentileri Android projesine aktarır
cd android
.\gradlew.bat assembleDebug
```

Çıktı: `yerel-asistan\android\android\app\build\outputs\apk\debug\app-debug.apk`

Kısayol: web dosyaları değiştiğinde `npm run esitle` (hazırla + `cap sync` + yamala).

İlk derleme Gradle bağımlılıklarını indirir (internet gerekir, yalnızca derleme sırasında). Uygulamanın kendisi çalışırken dış ağa çıkmaz.

## 3. Telefona kurulum

1. APK'yı telefona aktarın (USB kablo, `adb install app-debug.apk` ya da yerel paylaşım).
2. Telefon "bilinmeyen kaynak" uyarısı verir: Ayarlar > Uygulamalar > özel erişim > **Bilinmeyen uygulamaları yükle** altında APK'yı açan uygulamaya (Dosyalar vb.) geçici izin verin. Kurulumdan sonra izni geri kapatabilirsiniz. Google Play Protect uyarısı çıkarsa "Yine de yükle" deyin (uygulama Play Store dışından, kendi imzanızla geliyor).
3. İlk açılışta mikrofon izni istenir (ses tanıma için). Reddederseniz yazarak kullanabilirsiniz.

## 4. İmza notu

`assembleDebug` APK'yı Android'in **debug anahtarıyla** imzalar. Bu, kendi telefonunuza kurmak için yeterlidir; mağazaya konamaz ve debug anahtarı bilgisayardan bilgisayara değişir (başka bir bilgisayarda derlenen APK'nın üstüne güncelleme kurulmaz, önce eskiyi kaldırın). Kalıcı kullanım için kendi anahtarınızı üretin (`keytool -genkey -v -keystore piril.jks -alias piril -keyalg RSA -keysize 2048 -validity 10000`), anahtar dosyasını ve parolayı depoya **koymayın**, ardından Android Studio > Build > Generate Signed Bundle / APK ile `release` APK'sı üretin.

## 5. Bağlanma ve kullanım

- Tek başına: telefonda yalnızca cihaz becerileri (saat, hesap, zamanlayıcı, not) çalışır; sistem becerileri "bu cihazda desteklenmiyor" der.
- Bağlı: "Bilgisayara bağlan" sekmesine PC'deki adresi ve `PIRIL-…` eşleştirme kodunu girin. Bağlanınca "Uzaktan kontrol" sekmesi açılır; bilgisayarda "Uzaktan kontrole izin ver" kapalıysa kibar bir uyarı görürsünüz.

## 6. Sorun giderme

| Belirti | Çözüm |
|---|---|
| `Bağlantı kurulamadı` | Telefon ve bilgisayar aynı Wi-Fi'de mi? Bilgisayarda "Telefon bağlantısı" açık mı? Windows güvenlik duvarı portu engelliyor olabilir (özel ağ için izin verin). |
| `ws://` adresi reddediliyor | `yamala.js --ip` ile PC adresini eklediniz mi ve APK'yı yeniden derlediniz mi? |
| Mikrofon düğmesi yok | Telefonun ses tanıma servisi yok; yazarak kullanın. |
| `cap sync` sonrası izinler kayboldu | `node scripts\yamala.js` komutunu tekrar çalıştırın. |
| `Your project path contains non-ASCII characters` | Depo yolunda Türkçe harf var (ör. `Pırıl`). Klasörü taşımadan geçici sürücü harfiyle derleyin: `subst P: "<depo yolu>"`, `cd P:\yerel-asistan\android\android`, `.\gradlew.bat assembleDebug`; bitince `subst P: /d`. |

## Dosyalar

- `capacitor.config.json`: appId `com.piril.asistan`, `webDir: www`, harici URL yok, `androidScheme: http` (yerel `ws://` karışık içerik engeline takılmasın diye).
- `scripts/hazirla.js`: `www/` üretir. Çekirdek (CommonJS) harici paketleyici olmadan tek dosyaya (`cekirdek.bundle.js`) birleştirilir; `protokol/sifre.js` ve `istemci.js` ayrı betik olarak kopyalanır.
- `scripts/yamala.js` + `yamalar/`: yukarıdaki yamalar.
- Testler: `../test/android/`.
