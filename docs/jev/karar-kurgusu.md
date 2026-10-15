# Jev karar kurgusu

**Özet:** TEZDENEME'deki bütün oturumlar karar aşamasında `python3 -m jev danis` ile Jev'e danışır. Jev danışmandır, son karar verici değildir. Claude seçimini Jev'den önce kaydeder. Jev aynı soruyu iki farklı sırada yanıtlar. Ayrışma ya da kararsızlık olursa farklı modelde bir hakem bakar. Çoğunluk yoksa ya da konu kritikse kullanıcıya sorulur. Her adım yalnız eklenen bir deftere yazılır, Baş Denetmen de `rapor` ile Jev'in isabetini izler.

Etiket: [İP:Jev'i projeye bağlama#TMGrRs]

## Neden bu kurgu
- **Jev hatasız değil.** Jev bozuk biçimli cevap vermez ama emin göründüğü halde yanlış seçebilir. Bağımsız kalibrasyon ölçümü henüz yayımlanmadı ([eesel.ai](https://www.eesel.ai/blog/typesafe-jev)). Bu yüzden yüksek güvenli ve uyumlu cevaplarda otomatik ilerlenir, kalanlar başka göze gider.
- **Kör seçim.** Claude, Jev'in cevabını görmeden kendi seçimini kaydeder. Böylece Jev'e uyup uymadığı ölçülebilir ve iki görüş birbirinden etkilenmez.
- **Sıra değiştirme denetimi.** Model hakemlerde seçeneklerin sırası sonucu değiştirebilir (konum yanlılığı). Jev'e seçenekler bir kez düz, bir kez ters sırada sorulur; seçim değişirse Jev "kararsız" sayılır ve oyu geçersizdir ([Zheng vd. 2023](https://arxiv.org/pdf/2306.05685), [Shi vd. 2024](https://arxiv.org/html/2406.07791v9)).
- **Bağımsız hakem.** Claude ile Jev ayrışırsa farklı bir model (ör. `verifier`, claude-sonnet-5-5) iki seçimi görmeden seçer. 2/3 çoğunluk varsa uygulanır, yoksa kullanıcıya sorulur.
- **Kritik kararlar.** Mimari, güvenlik, veri bütünlüğü ve geri alınamaz işlerde Jev yalnızca görüş bildirir; karar kullanıcı ve Opus'tadır (CLAUDE.md Jev kuralları).
- **Ölçerek güven.** `sonuc` ve `kullanici` kayıtları Jev'in gerçek isabetini ve olasılık kovalarına göre kalibrasyonunu verir. Eşikler (güven 0,60, marj 0,15) bu kayıtlarla sonradan ayarlanır.

## Akış
1. Claude seçenekleri ve kendi seçimini yazar → `claude_secimi` kaydı.
2. Jev iki sırada çağrılır → `jev_danisma` kaydı ve bir eylem:
   - `uygula`: Jev iki sırada da aynı ve Claude ile uyumlu (güven düşükse "zayıf onay").
   - `bagimsiz_kontrol`: ayrışma ya da kararsızlık → hakem → `sonuclandir`.
   - `kullanici_onayi`: kritik kategori.
   - `claude_karari`: Jev'e erişilemedi (degraded), Claude devam eder ve bunu açıkça söyler.
3. Hakem ya da kullanıcı kararı → `hakem` / `kullanici_karari` kaydı. `--kullanici` yalnız normal kategoride ve kullanıcının sohbetteki onay mesajının kimliğiyle (`--onay-mesaji cmsg_...`) çalışır; kayıt `dogrulanmamis` işaretlidir ve onayın kanıtı değildir. Kritik kategorilerde araca yazılmaz; karar kullanıcının sohbetteki açık onayıyla ilerler.
4. Gerçek sonuç anlaşılınca → `gercek_sonuc` kaydı.

## Jev'e ne gider, ne gitmez
- Gider: soru, kısa bağlam (en fazla 4.000 karakter), seçenek açıklamaları.
- Gitmez: Claude'un seçimi ve gerekçesi, dosya içerikleri, gizli bilgi. Gizli bilgi desenine uyan bir metin varsa istek hiç gönderilmez (`gizli_girdi`) ve deftere bu metin yerine yalnızca `<gizli>` yazılır.
- Kanal (bulut yolu): Vercel AI Gateway (`ai-gateway.vercel.sh`, model `typesafe-ai/jev`). Uç nokta ve model bu yolda koda sabittir, ortam değişkeniyle değiştirilemez; yönlendirmeler reddedilir. Bu sabitlikler YALNIZ bulut yolu için geçerlidir.
- Kanal (cihaz yolu): isteği bu paket değil, cihazdaki mevcut Hafıza OS modülü (`jev_cagri.py` → `jev_client`) yapar. Uç noktayı o modülün ayar dosyası belirler ve o modülün kendi uç nokta politikası (yalnız sağlayıcının resmi HTTPS host'u ya da loopback, yönlendirme reddi) uygulanır. Bu paket o yolda yalnız dönen yanıtı doğrular.
- Model adı: Vercel AI Gateway yalnız sürümsüz `typesafe-ai/jev` adını kabul eder (11 Ekim 2026 testinde `jev-1.13.0` gibi sabit adlar 404 verdi); sabit sürüm yalnız TypeSafe'in doğrudan API'siyle mümkündür ve kullanıcı izni şu an yalnız Vercel için olduğundan sağlayıcının bildirdiği model her kayıtta tutulur ve `rapor` (`jev_modelleri`, `uyarilar`) değişimi gösterir.

## Nerede çalışır
| Ortam | Yol | Gereken |
|---|---|---|
| Cihaz | Mevcut `<jev-araclar>\jev_cagri.py` → `jev_client` isteği yapar (anahtarı ve uç noktayı kendi ayar dosyasından alır, kendi uç nokta politikasını uygular); bu paket yalnız yanıtı doğrular | Bir şey gerekmez |
| Bulut iş parçacıkları | Doğrudan Vercel AI Gateway (sabit uç nokta ve model, yönlendirme reddi bu pakette) | Bulut ortamında `AI_GATEWAY_API_KEY` ortam değişkeni ve `ai-gateway.vercel.sh` alan adı izni |

Bulut ortamı kurulana kadar bulut oturumları `claude_karari` (Jev'e erişilemedi) durumunda çalışır ve bunu açıkça yazar.

### Bulut kurulumu (Yusuf yapar)
1. Proje ayarları → Cloud environment menüsü → **Add cloud environment**.
2. Network access: **Limited**, Allowed domains'e `ai-gateway.vercel.sh` ekle (Allow package managers işaretli kalsın).
3. Environment variables: `AI_GATEWAY_API_KEY=<Vercel AI Gateway anahtarın>`. Anahtarı sohbete, nota ya da koda yazma.
4. Kaydet; yeni başlayan oturumlar bu ortamı kullanır. Kontrol: `python3 -m jev durum`.

## Defter
- Bulutta: `/mnt/project-files/jev-kararlar/kararlar.jsonl` (bütün iş parçacıkları ortak kullanır).
- Cihazda (Windows): `<jev-araclar>\kayit\kararlar.jsonl`. Kök `JEV_ARACLAR` ortam değişkeninden gelir ya da `jev_cagri.py` paketin iki üst dizininde duruyorsa paketin yanında kendiliğinden bulunur.
- Yalnız ekleme yapılır, satır silinmez. `JEV_KAYIT` ile değiştirilebilir; yol mutlak, `.jsonl` uzantılı ve sembolik bağsız olmalıdır.

## Birlikte çalışılanlar
- implementer (claude-sonnet-5-5): `jev/` paketi ve testleri.
- verifier (claude-sonnet-5-5): bağımsız doğrulama ve ayrı bir güvenlik incelemesi.
- Bilgi alınan iş parçacıkları: [İP:Hafıza OS kurulumu#7Ge4Dj], [İP:TypeSafe Jev başvurusu#Lf3iP8], [İP:Jev kullanım alanları araştırması#pFXnL1], [İP:Bağımsız denetmen#aNYXth].
