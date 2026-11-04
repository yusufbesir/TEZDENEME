# Jev not puanlama

> **Özet:** Yusuf'un bilgisayarında her gün 08:41'de çalışan bir iş, hafıza notlarını (`.md`) Jev'e puanlatır ve Türkçe bir rapor yazar. İş notlara salt okunur bakar; hiçbir notu taşımaz, değiştirmez ya da silmez. Jev yalnız önerir (koru, güncelle, arşiv); karar Yusuf'undur.

## Ne yapar
- `scripts/jev_not_puanla.py` kasadaki notları gezer. Atlananlar: `Benim Notlarım`, `anahtarlar`, `Yusuf'un Notları`, nokta ile başlayan klasörler (`.obsidian`, `.git`, `.claude`, `.cache`) ve rapor klasörünün kendisi. Yolunda `anahtarlar` geçen hiçbir şey okunmaz.
- Her not için tek soru sorulur: `koru` (güncel ve gerekli), `guncelle` (gerekli ama eskimiş ya da çelişkili olabilir), `arsiv` (artık gereksiz, arşive taşınması önerilir).
- Önbellek (`<rapor klasörü>\.onbellek.json`) not içeriğinin SHA-256 özetini tutar. Değişmeyen not tekrar puanlanmaz; her çalıştırma en fazla `--en-fazla` (varsayılan 40) yeni ya da değişmiş notu, en eskiden başlayarak puanlar.
- Rapor: `<rapor klasörü>\<YYYY-MM-DD> Jev not puanlama raporu.md`. Aynı ad varsa üzerine yazılmaz, `(2)`, `(3)` eki alır. Önce arşiv önerileri, sonra güncelleme önerileri, koru için yalnız sayı yazılır.
- Jev'e ulaşılamazsa sonuç "degraded (kod)" olarak yazılır, hüküm sayılmaz ve önbelleğe alınmaz. Art arda 5 degraded olursa iş durur ve raporda belirtilir.
- Sayma, tarih ve sıralama kodla yapılır.

## Jev'e ne gider
Yalnızca: notun kasa köküne göre yolu, başlığı (ilk başlık ya da dosya adı), son değişiklik tarihi (kodla hesaplanır) ve gövdenin ilk 1500 karakteri. `istemci.gizli_mi` gizli bilgi bulursa not gönderilmez; raporda "gizli içerik, gönderilmedi" altında listelenir. Taşıma cihazdaki `JEV_ARACLAR` modülüdür.

## Kurulum
```
powershell -ExecutionPolicy Bypass -File scripts\jev-not-puanla-gorev.ps1
```
`-RepoKoku` varsayılanı `D:\YusufII\Projeler\TEZDENEME`. Görev yalnız geçerli kullanıcı için kaydedilir; yönetici hakkı gerekmez. Tekrar çalıştırmak görevi günceller. Görev yalnız kullanıcı oturum açıkken çalışır (kapalıysa oturum açılınca telafi eder) ve `python` komutunun kullanıcının PATH'inde olması gerekir.

## Kaldırma
```
powershell -ExecutionPolicy Bypass -File scripts\jev-not-puanla-gorev.ps1 -Kaldir
```

## Elle deneme
```
python scripts\jev_not_puanla.py --kasa <kök> --cikti <rapor klasörü> --kuru
```
`--kuru` hangi notların gönderileceğini listeler; Jev çağrısı ve yazma yapmaz.
