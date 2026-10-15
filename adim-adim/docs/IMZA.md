# Android yayın imzası
[İP:Adım Adım öğrenme uygulaması#Dwv81f]

Release derlemesi artık hata ayıklama anahtarıyla değil, geliştiricinin cihazındaki ayrı bir yayın anahtar deposuyla imzalanır.

## Dosyalar
- `android/key.properties` (depoya girmez, `.gitignore`): `storePassword`, `keyPassword`, `keyAlias`, `storeFile`.
- Anahtar deposu `*.jks` (depoya girmez): önerilen konum cihazda, depo klasörünün dışında, örneğin `D:\YusufII\Araclar\anahtar\adim-adim-yayin.jks`.
- `android/app/build.gradle.kts`: `key.properties` varsa `yayin` imza yapılandırmasını kullanır; yoksa uyarı basar ve hata ayıklama anahtarına düşer (yalnız yerel deneme için).

## Anahtar deposu oluşturma (cihazda, bir kez)
```
keytool -genkeypair -v -keystore D:\YusufII\Araclar\anahtar\adim-adim-yayin.jks -storetype JKS -alias adimadim -keyalg RSA -keysize 4096 -validity 10950
```
Ardından `android/key.properties` dosyasını yukarıdaki alanlarla doldurun. Şifreler yalnızca bu dosyada ve bir parola yöneticisinde durur; notlara, sohbete ya da depoya yazılmaz.

## Yedek
Anahtar deposunun kaybı uygulamanın güncellenememesi demektir. `.jks` dosyasını ve şifreleri ayrı, güvenli bir yere (parola yöneticisi ya da şifreli harici disk) yedekleyin.

## Kurallar
- `key.properties` ve `*.jks` hiçbir zaman commit edilmez; `.gitignore` bunu engeller.
- Şifreler kasa notlarına ve Mem0'a yazılmaz.
- Yayın derlemesi `key.properties` olmadan dağıtılmaz.
