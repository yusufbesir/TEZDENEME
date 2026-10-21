# Korece, Japonca ve Çince kursları: notlar (ÖZELLİK 67)

Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

## Kurslar

| Kurs | Kimlik | Dosya | Ses dili |
|---|---|---|---|
| Korece A1: Başlangıç | `korece-1` | `lib/icerik/korece_a1.dart` | `ko-KR` |
| Japonca A1: Başlangıç | `japonca-1` | `lib/icerik/japonca_a1.dart` | `ja-JP` |
| Çince A1: Başlangıç | `cince-1` | `lib/icerik/cince_a1.dart` | `zh-CN` |

Her kurs 3 ünite x 2 ders. 1. ünite "Yazı sistemi" (Hangıl / Hiragana + Katakana / Pinyin + 4 ton + 10 hanzi), 2. "Selamlaşma ve tanışma", 3. "Sayılar ve günlük ifadeler". Soyle (konuşma) yalnız 2. ve 3. ünitede birer tane. Yaz alıştırmalarında cevap romanizasyon (ya da hedef yazı / Türkçe) olabilir; CJK klavyesi gerekmez.

## Yazı tipi

Yeni yazı tipi **gömülmedi**. Windows'ta sistem CJK yazı tipleri kullanılır (Malgun Gothic, Yu Gothic / Meiryo, Microsoft YaHei). Bu yazı tipleri yoksa (ör. çok sade bir sunucu sürümü) harfler kutucuk görünür; çözüm Windows'a ilgili dil paketini eklemektir.

## Sesli okuma (TTS) ses paketleri

`Dinle` ve `Soyle` alıştırmaları `Ses.oku(metin, dil: ...)` ile alıştırmanın `dil` alanını kullanır (`ko-KR`, `ja-JP`, `zh-CN`; varsayılan `en-US`). `Soyle` konuşma tanımayı da aynı dille başlatır (`KonusmaTanima.dinle(dil:)`).

Windows'ta bu dillerin **metin okuma (TTS) ses paketi kurulu olmalıdır**:

1. Ayarlar > Zaman ve dil > Dil ve bölge > Dil ekle: Korece, Japonca, Çince (Basitleştirilmiş). Dil eklerken "Metin okuma" seçeneği işaretli olmalıdır.
2. Kontrol: Ayarlar > Zaman ve dil > Konuşma > Sesleri yönet. Listede Korece (ör. Heami), Japonca (ör. Haruka / Ayumi), Çince (ör. Huihui / Yaoyao) sesleri görünmelidir.
3. Kurulumdan sonra uygulamayı yeniden aç.

## Ses paketi eksikse mevcut davranış

- `Ses.oku` yalnız `flutter_tts` bir **istisna fırlatırsa** `false` döndürür (hatayı yutar). Bu durumda `Dinle` "Ses kullanılamıyor; cümle yazılı gösterildi" der ve okunacak cümleyi yazıyla gösterir; kullanıcı yine de seçeneklerden birini seçebilir. `Soyle` hedef cümleyi zaten yazıyla gösterir; aynı durumda ek olarak ses hatası iletisi çıkar.
- Ses ayarı kapalıysa (Ayarlar) `Dinle` düğmesi pasif olur ve cümle yazıyla gösterilir.
- Ses paketi **kurulu değilse** `flutter_tts` çoğu zaman istisna fırlatmaz; `setLanguage` sessizce reddedilir ve `oku` `true` döner. Bu durumda uygulama bunu **algılayamaz**: varsayılan sesle okunur (CJK metin için genellikle sessiz ya da anlamsız ses). Windows'ta bu davranış bu ortamda (Linux) denenemedi; Windows'ta elle doğrulanmalıdır. Kalıcı çözüm gerekirse `FlutterTts.isLanguageAvailable(dil)` denetimi ve "ses paketi kurulu değil" iletisi eklenebilir (bu özellikte yapılmadı).
- Konuşma tanıma (`Soyle`) için ayrıca Sherpa dil modeli gerekir (`docs/KONUSMA-TANIMA-KURULUM.md`); model yoksa ya da dil modeli ilgili dili tanımıyorsa "Bu alıştırmayı atla" yolu açılır ve sonuç bildirilmez.

## Telaffuz puanlama

`telaffuzKelimeleri` Hangıl sözcüklerini kelime olarak, Hiragana/Katakana/Han harflerini ise (Japonca ve Çince boşluksuz yazıldığından) harf harf birim sayar; noktalama yok sayılır. Latin metin davranışı değişmedi.

## Sözlük

Sözlük maddeleri kurs içeriğinden üretilir (Eşleştirme çiftleri). Korece/Japonca/Çince maddeler `dil` = `ko` / `ja` / `zh`; kelime "hedef yazı (romanizasyon)" biçimindedir. Sözlük ekranında Korece/Japonca/Çince çipleri vardır; "Oku" düğmesi parantez içi romanizasyonu atıp hedef yazıyı kurs diliyle okur. Günün kelimesi yalnız İngilizce kalır.

## Bilinen sınırlar

- Bilgi Yarışması bu kurslar için soru bankası içermez (yarışma seviyeleri sabit listedir).
- İçerik doğruluğu bir anadil konuşuru tarafından gözden geçirilmedi; yalnız temel, yaygın sözcükler kullanıldı.
