# API (kimlik doğrulamalı JSON / XML)

Betiklerin ve diğer programların panel dışından kısa bağlantı oluşturması ve sorgulaması içindir. Tek uç vardır ve YOURLS'teki `action` parametresine benzer çalışır:

```
https://ALAN-ADINIZ/api/v1/
```

## 1. Anahtar almak

1. Panelde **API anahtarlarım** > **Yeni API anahtarı** > bir ad girin (örn. “Muhasebe betiği”) ve **mevcut parolanızı** yazın. İki adımlı doğrulamanız (MFA) açıksa geçerli **doğrulama kodu** (TOTP) da zorunludur; aynı kod ikinci kez kabul edilmez. Parola/kod yanlışsa anahtar oluşmaz ve deneme, panel girişiyle ortak başarısız-deneme sayaçlarına yazılır. Kullanıcı başına en fazla **10 aktif anahtar** olabilir (`API_AZAMI_ANAHTAR`); aşılırsa yeni anahtar oluşmaz, kullanılmayan birini iptal edin. Anahtar oluşturma ucu da kullanıcı başına dakikada `API_ANAHTAR_OLUSTURMA_HIZ_SINIRI` (5) ile sınırlıdır.
2. Anahtar **yalnızca bir kez** gösterilir. Kopyalayıp güvenli bir yere (parola yöneticisi, sunucu gizli değişkeni) kaydedin. Sunucuda düz hâli saklanmaz; kaybederseniz anahtarı iptal edip yenisini oluşturun.
3. Anahtar sizin **yetkilerinizle** çalışır: okuma eylemleri için `qr.view_qrkod`, `shorturl` için `qr.add_qrkod` izni gerekir. İzleyici rolü anahtar oluşturabilir ama `shorturl` 403 alır.
4. Sızdığından şüphelendiğiniz anahtarı hemen panelden iptal edin. Hesabınızda **parola değişince, MFA sıfırlanınca, rol değişince veya hesap pasifleştirilince** bütün aktif anahtarlarınız otomatik iptal edilir ve API parola girişi kapatılır (kayıtlar silinmez; yeniden etkinleştirmek anahtarları geri getirmez, yenilerini oluşturmanız gerekir). Yönetici rolü tüm kullanıcıların anahtarlarını görüp iptal edebilir.

Anahtar biçimi: `qrk_<12 karakter önek>_<gizli kısım>`. Listede yalnızca önek görünür.

## 2. Kimlik doğrulama

### 2.1 API anahtarı (önerilen)

Anahtar `Authorization` başlığıyla gönderilir:

```
Authorization: Bearer <ANAHTAR>
```

- Sorgu dizesinde (`?api_key=…`, `?signature=…`) veya gövdede anahtar **kabul edilmez**; böyle bir istek 401 alır (adresler günlüklere yazıldığı için).
- Anahtar iptal edilmişse veya sahibi pasifse 401 döner. Panel oturum çerezi bu uçta geçersizdir.

### 2.2 Kullanıcı adı + parola (isteğe bağlı, varsayılan KAPALI)

Anahtar yerine, `Authorization` başlığı olmadan **POST gövdesinde** `username` ve `password` gönderilebilir. Her kullanıcı bunu kendisi açmalıdır: panelde **API anahtarlarım** sayfasında “Parola girişini aç” (mevcut parola istenir). Kapalıyken doğru parola bile 401 alır.

```bash
curl -s -X POST https://ALAN-ADINIZ/api/v1/ \
  -d action=db-stats -d username=<KULLANICI> --data-urlencode password=<PAROLA> -d totp=<KOD>
```

- Parola ve `totp` **yalnızca POST gövdesinde** kabul edilir; sorgu dizesinde gelirse 401.
- Hesapta MFA etkinse `totp` kodu **zorunludur** (MFA atlatılamaz). Aynı kod ikinci kez kabul edilmez; bu yüzden MFA’lı hesapta en fazla 30 saniyede bir istek yapılabilir. Sık kullanım için API anahtarı kullanın.
- MFA zorunlu (`MFA_ZORUNLU`) ama hesapta kurulu değilse de 401.
- **Tek tip 401:** parola girişinde yanlış parola, eksik/yanlış `totp`, parola girişinin kapalı olması ve MFA’nın kurulu olmaması durumlarının hepsi aynı HTTP 401 ve aynı `Kimlik doğrulanamadı.` mesajını döndürür ve aynı başarısız-deneme sayacına yazılır; böylece yanıt parolanın doğru olup olmadığını ele vermez. Gerçek neden yalnızca denetim kaydında (`api_giris_basarisiz`) görünür.
- Başarısız denemeler panel girişiyle **aynı sayaçları** kullanır (IP başına dakikada `GIRIS_HIZ_SINIRI`=10, kullanıcı+IP / IP / hesap kilitleri); aşılırsa 429 ve doğru parola bile reddedilir. Başarılı ve başarısız girişler denetim kaydına yazılır (parola yazılmaz).
- Parola her istekte gönderildiği için yalnızca HTTPS üzerinden ve güvenilir betiklerde kullanın.

## 3. Ortak kurallar

| Parametre | Açıklama |
|---|---|
| `action` | Zorunlu: `shorturl`, `expand`, `url-stats`, `stats`, `db-stats`, `version` |
| `format` | `json` (varsayılan), `xml`, `simple` (düz metin; yalnızca `shorturl` ve `expand`) |

- GET ve POST desteklenir; `shorturl` yalnızca POST (GET ile 405). Bilinmeyen `action` veya `format` 400 döner.
- Her yanıtta `statusCode` (HTTP durum koduyla aynı), `status` (`success`/`fail`) ve `message` bulunur. Yanıtlar `Cache-Control: no-store` ile gelir.
- POST gövdesi form kodlamalıdır (`-d` / `application/x-www-form-urlencoded`). CSRF belirteci gerekmez.
- `simple` biçiminde hatalarda yalnızca hata metni ve ilgili HTTP durum kodu döner.

| Kod | Anlamı |
|---|---|
| 200 | Başarılı |
| 400 | Geçersiz parametre (Türkçe mesaj) |
| 401 | Kimlik doğrulama başarısız (yanlış/iptal anahtar; parola girişinde: yanlış parola, eksik/yanlış `totp`, hesapta parola girişi kapalı, MFA zorunlu ama kurulu değil — hepsi aynı 401 ve aynı mesaj: `Kimlik doğrulanamadı.`) |
| 403 | Kimliğin sahibinin bu işlem için yetkisi yok |
| 404 | Kısa bağlantı bulunamadı |
| 405 | Yöntem desteklenmiyor |
| 409 | Aynı hedef başka kodlarda kullanılıyor (`force=1` ile geçilir) |
| 429 | Hız sınırı; `Retry-After: 60` başlığı gelir |

## 4. Eylemler

### shorturl (POST): kısa bağlantı oluştur

| Parametre | |
|---|---|
| `url` | Zorunlu. Panel formuyla aynı güvenlik denetimi (yalnızca http/https, özel/iç ağ adresleri reddedilir). |
| `keyword` | İsteğe bağlı kısa kod. Boşsa otomatik üretilir. Ayrılmış kelimeler ve biçim kuralları panelle aynıdır; büyük/küçük harf duyarsız benzersizdir. |
| `title` | İsteğe bağlı hedef başlığı. Boşsa ve ayar açıksa sunucu hedef sayfanın başlığını güvenli biçimde çekmeye çalışır (başarısız olursa boş kalır; bkz. GUVENLIK.md). Yanıttaki `title` kaydedilen değerdir. |
| `ad` | İsteğe bağlı QR kod adı. Yoksa başlıktan, o da yoksa kısa koddan türetilir. |
| `force` | `1` ise “aynı hedef” uyarısı geçilir. |

```bash
curl -s -X POST https://ALAN-ADINIZ/api/v1/ \
  -H "Authorization: Bearer <ANAHTAR>" \
  -d action=shorturl -d url=https://ornek.com/kampanya -d keyword=YAZ-2026 -d title="Yaz kampanyası"
```

```json
{"statusCode": 200, "status": "success", "message": "Kısa bağlantı oluşturuldu.",
 "shorturl": "https://ALAN-ADINIZ/k/YAZ-2026", "keyword": "YAZ-2026", "url": "https://ornek.com/kampanya", "title": "Yaz kampanyası"}
```

Aynı hedef başka bir arşivlenmemiş kodda varsa (ve Ayarlar’da “aynı hedef uyarısı” açıksa) ve `force` yoksa **409** döner ve `kodlar` listesi mevcut kodları verir. Oluşturma panelle aynı kayıtları yazar: hedef geçmişi ve denetim kaydı (kullanıcı = anahtar sahibi, kaynak “API”). Kullanıcı başına QR oluşturma sayacına (`QR_OLUSTURMA_HIZ_SINIRI`) panelle birlikte 1 yazılır; aşılırsa 429.

### expand: kısa kodun hedefi

`shorturl` parametresi kısa kod ya da tam kısa bağlantı olabilir.

```bash
curl -s -H "Authorization: Bearer <ANAHTAR>" "https://ALAN-ADINIZ/api/v1/?action=expand&shorturl=YAZ-2026"
```

Yanıt: `keyword`, `shorturl`, `longurl` (sayfa hedefliyse `/s/<slug>` tam adresi), `title`, `durum`. Yoksa 404.

### url-stats: tek kodun istatistiği

```bash
curl -s -H "Authorization: Bearer <ANAHTAR>" "https://ALAN-ADINIZ/api/v1/?action=url-stats&shorturl=YAZ-2026&format=xml"
```

`expand` alanlarına ek olarak: `tarama_toplam` (bot dahil), `tarama_bot_haric`, `tekil_tahmini` (botlar hariç; panel istatistiğiyle aynı yöntem, kesin kişi sayısı değildir), `son_tarama` (bot hariç son tarama, yoksa boş), `olusturma`.

### stats: liste ve toplamlar

| Parametre | |
|---|---|
| `filter` | `top` (en çok taranan, varsayılan), `bottom`, `last` (en son oluşturulan), `rand` |
| `limit` | 1-100, varsayılan 10 (verilmezse boş dönmez). Yalnızca ASCII rakam kabul edilir (`1_0`, `+5`, `٣` 400 alır). `filter=rand` için en fazla 10 kayıt döner. |

`stats` ve `db-stats` sonuçları kullanıcı ve parametre başına 60 saniye önbellekte tutulur (yeni kayıtlar en çok 60 sn gecikmeyle görünür); `filter=rand` önbelleğe alınmaz.

```bash
curl -s -H "Authorization: Bearer <ANAHTAR>" "https://ALAN-ADINIZ/api/v1/?action=stats&filter=top&limit=5"
```

Yanıt: `links` listesi (her biri `keyword`, `shorturl`, `longurl`, `title`, `durum`, `tarama_toplam`, `tarama_bot_haric`, `olusturma`) ve `toplam_kod`, `toplam_tarama_bot_haric`, `toplam_tarama_bot_dahil`.

### db-stats

`toplam_kod`, `toplam_tarama_bot_haric`, `toplam_tarama_bot_dahil`.

### version

`version`: API sürümü (`"1"`; uyumluluk için değişmez). `uygulama_surumu`: uygulamanın sürümü (`app/config/surum.py` içindeki tek tanım, ör. `"1.0.0"`; panelde Sistem bilgisi sayfasındaki değerle aynıdır).

```json
{"statusCode": 200, "status": "success", "message": "success", "version": "1", "uygulama_surumu": "1.0.0"}
```

Diğer eylemler gibi kimlik doğrulaması gerekir. `YONETIM_IZINLI_AGLAR` doluysa ve istemci izinli bir ağda değilse `/api/` yolu (geçerli anahtarla bile) 404 döner ([GUVENLIK.md](GUVENLIK.md)).

## 5. Biçimler

```bash
# XML (özel karakterler kaçışlanır; kök öğe <result>)
curl -s -H "Authorization: Bearer <ANAHTAR>" "https://ALAN-ADINIZ/api/v1/?action=db-stats&format=xml"
# düz metin: yalnızca kısa bağlantı
curl -s -X POST -H "Authorization: Bearer <ANAHTAR>" -d action=shorturl -d url=https://ornek.com/a -d format=simple https://ALAN-ADINIZ/api/v1/
```

## 6. Hız sınırları

- Başarılı istekler anahtar başına dakikada `API_HIZ_SINIRI` (varsayılan 60) **ve** kullanıcı başına ortak olarak dakikada `API_KULLANICI_HIZ_SINIRI` (varsayılan `API_HIZ_SINIRI`) ile sınırlanır; kullanıcının bütün anahtarları ve parola girişi aynı kullanıcı sayacını paylaşır, yani çok anahtar oluşturarak sınır aşılamaz.
- Başarısız kimlik doğrulama IP başına dakikada `API_BASARISIZ_HIZ_SINIRI` (varsayılan 10); aşılınca 429.
- Sayaçlar veritabanında paylaşımlıdır; aşılırsa bir dakika bekleyin.

## 7. Tarayıcıdan erişim (CORS)

JSONP yoktur (`format=jsonp` veya `callback` 400 döner). Tarayıcıdaki bir sayfadan çağırmak için sunucuda `API_CORS_KOKENLERI` ayarına izinli kökenleri virgülle yazın (örn. `https://uygulama.ornek.com`). Boşsa (varsayılan) hiçbir CORS başlığı gönderilmez. Doluysa yalnızca listedeki `Origin` için `Access-Control-Allow-Origin` döner (yıldız asla kabul edilmez), `Vary: Origin` eklenir ve `OPTIONS` ön uçuş isteği `Authorization` ve `Content-Type` başlıklarına izin verir. `Access-Control-Allow-Credentials` gönderilmez. Anahtarı herkese açık bir web sayfasının içine gömmeyin.

## 8. Notlar

- `SECRET_KEY` değiştirilirse bütün API anahtarları geçersiz olur (özetler bu anahtarla üretilir); anahtarlar yeniden oluşturulmalıdır.
- API ile kod silinemez veya düzenlenemez; yalnızca oluşturma ve okuma vardır.
- Anahtar oluşturma ve iptal işlemleri denetim kaydına yazılır; anahtarın kendisi hiçbir yere yazılmaz.
