# Android yayın imzası
[İP:Adım Adım öğrenme uygulaması#Dwv81f]

Release derlemesi hata ayıklama anahtarıyla değil, geliştiricinin cihazındaki ayrı bir yayın anahtar deposuyla imzalanır.

## Dosyalar
- `key.properties` (düz metin şifre içerir): **`%USERPROFILE%\.anahtar\key.properties`**. Proje klasörüne KONMAZ; `D:\YusufII` ağacını diğer hesaplar da okuyabilir. Alanlar: `storePassword`, `keyPassword`, `keyAlias`, `storeFile`.
- Anahtar deposu `adim-adim-yayin.jks`: aynı `.anahtar` klasöründe. Konum ve ACL aşağıda.
- `android/app/build.gradle.kts` `key.properties` dosyasını YALNIZ `<kullanıcı profili>/.anahtar/key.properties` konumunda arar. Proje içinde (`android/key.properties`) geri dönüş yolu bilerek yoktur; `.gitignore` kuralları yalnız yanlışlıkla eklenmeye karşı durur. Log'a yalnız dosya yolu yazılır, şifre asla yazılmaz.
  Bulursa `yayin` imza yapılandırmasını kullanır. Bulamazsa:
  - **her release görevinde (assembleRelease, bundleRelease, `flutter build apk --release`) derlemeyi durdurur**; `android/gradle.properties` içinde `dagitim=true` varsayılandır, bayrak unutulamaz,
  - yalnız `-Pdagitim=false` açıkça verilirse uyarı basar ve hata ayıklama anahtarına düşer (yerel deneme).

## Anahtar deposunun konumu
Varsayılan ve önerilen konum, yalnız oturum açan kullanıcının erişebildiği kullanıcı profili:

```
%USERPROFILE%\.anahtar\adim-adim-yayin.jks
```

`D:\YusufII\Araclar\anahtar` gibi `D:\YusufII` altındaki bir konum önerilmez: o ağaçta
`Authenticated Users` için miras alınmış **Modify** izni vardır; aynı makinede oturum açan
her hesap anahtarı okuyabilir ve değiştirebilir. Yine de orada tutulmak isteniyorsa klasöre
mirası kesen ve yalnız kullanıcıya izin veren ayrı bir ACL uygulanmalıdır (yalnız sahibinin
onayıyla; betik bunu kendiliğinden yapmaz):

```
icacls "D:\YusufII\Araclar\anahtar" /inheritance:r /grant:r "%USERNAME%:(OI)(CI)F" /grant:r "SYSTEM:(OI)(CI)F"
```

## Anahtar deposu oluşturma (cihazda, bir kez)
JDK gerekir (`keytool`). Depo türü PKCS12 (JKS özel biçimdir ve keytool'da kullanımdan kalkmıştır):

```
mkdir %USERPROFILE%\.anahtar
keytool -genkeypair -v -keystore %USERPROFILE%\.anahtar\adim-adim-yayin.jks -storetype PKCS12 -alias adimadim -keyalg RSA -keysize 4096 -validity 10950
```

Ardından aynı klasördeki `key.properties.sablon` dosyasını doldurup `%USERPROFILE%\.anahtar\key.properties` olarak kaydedin (`storeFile` tam yol, `/` ayırıcıyla). Dosyayı proje klasörüne kopyalamayın:

```
storePassword=...
keyPassword=...
keyAlias=adimadim
storeFile=C:/Users/<kullanici>/.anahtar/adim-adim-yayin.jks
```

Şifreler yalnızca bu dosyada ve bir parola yöneticisinde durur; notlara, sohbete ya da depoya yazılmaz.

## Dağıtım derlemesi
```
cd adim-adim
flutter build apk --release      # ya da flutter build appbundle
```
Ek bayrak gerekmez; koruma varsayılan açıktır. `key.properties` bulunamazsa derleme şu hatayla durur:
"Release derlemesi için key.properties gerekli (%USERPROFILE%\.anahtar\key.properties)". Yalnız yerel deneme için:
`cd android && gradlew -Pdagitim=false assembleRelease` (debug anahtarı, dağıtılmaz).

## Yedek
Anahtar deposunun kaybı uygulamanın güncellenememesi demektir. `.jks` dosyasını ve şifreleri ayrı, güvenli bir yere (parola yöneticisi ya da şifreli harici disk) yedekleyin.

## Kurallar
- `key.properties` ve `*.jks` hiçbir zaman commit edilmez ve proje klasörüne konmaz; yine de kök ve alt `.gitignore` dosyaları yanlışlıkla eklenmelerini engeller.
- Şifreler kasa notlarına ve Mem0'a yazılmaz.
- Yayın derlemesi `key.properties` olmadan dağıtılmaz; `dagitim=true` varsayılanı bunu zorlar, `-Pdagitim=false` yalnız yerel deneme içindir.
