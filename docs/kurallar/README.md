# Proje kuralları (ayrıntılı)

> **Özet:** Claude Code proje talimatları kutusu yaklaşık 16.000 karaktere ulaştığı için uzunluk uyarısı veriyordu. Ayrıntılı kurallar buraya, konuya göre üç dosyaya taşındı; kutuda yalnızca kısa özet ve bu klasörün yolu kalır. Kural içeriği değişmedi, yalnızca yeri ve düzeni değişti. Sahibi: Yusuf. [İP:Talimat düzeni#zkd4TM]

## Hangi dosyada ne var
| Dosya | Konular |
|---|---|
| [hafiza-ve-not.md](hafiza-ve-not.md) | Model ataması, not alma, hafızadan silme yasağı, not okuma, hafıza ve Jev, ortak beyin, silme biçimi ve dosya açıklamaları |
| [guvenlik-ve-dosya.md](guvenlik-ve-dosya.md) | E-posta, güvenlik, dosya düzeni ve iş sahipliği, tarayıcı koruması, tersine mühendislik aracı (Windows kurulum kuralı `.claude/rules/` altında) |
| [orkestrasyon-ve-kayit.md](orkestrasyon-ve-kayit.md) | Orkestratör ve Baş Denetmen, etiketleme, token ve araç kaydı, kesintiden sonra devam, Archify (emek illüzyonu kuralı `.claude/rules/` altında) |
| [dis-fikirler-avenox.md](dis-fikirler-avenox.md) | avenoxai incelemesinden alınan ek öneriler: onay kapısı, diskten devam, hafıza arşivi, kota ve zorluğa göre model, worktree, sır taraması (onay bekler) |
| [durustluk-ve-iletisim.md](durustluk-ve-iletisim.md) | Dürüstlük ve kısa yanıt kuralı, skill'i sormadan kullanma |
| [yusuf-ile-konusma-rehberi.md](yusuf-ile-konusma-rehberi.md) | Yusuf için iyi istek şablonu ve ipuçları |
| [skill-incelemesi-2026-10-24.md](skill-incelemesi-2026-10-24.md) | caveman ve 6 depo güvenlik incelemesi |
| [`.claude/rules/windows-uygulama-dagitimi.md`](../../.claude/rules/windows-uygulama-dagitimi.md) | Yola bağlı: Windows kurulum, güncelleme, kaldırma, klasör düzeni |
| [`.claude/rules/emek-illuzyonu.md`](../../.claude/rules/emek-illuzyonu.md) | Yola bağlı: arayüz dosyalarında emek illüzyonu |

## Yeni kural nereye gider
| Kuralın niteliği | Yer | Neden |
|---|---|---|
| Her oturumda geçerli, kısa (birkaç satır) | `CLAUDE.md` (200 satırın altında kalmalı) | Her oturumda yüklenir; şişerse bağlam maliyeti artar |
| Yalnızca belirli dosyalar/klasörlerde geçerli | `.claude/rules/<konu>.md` + `paths:` | Yalnızca o yollar açılınca yüklenir |
| Tekrarlanan adım adım iş (not yazma, yayın vb.) | `.claude/skills/<ad>/SKILL.md` | Çağrılınca yüklenir, kuralı değil prosedürü taşır |
| Mevcut skill'ler | `kasa-notu-yaz`, `is-kaydi`, `denetmen-raporu` | Kasa notu, iş kaydı (commit, PR, günlük, CHECKPOINT), denetmen raporu |
| Uzun gerekçe, kullanıcı kararı, referans | `docs/kurallar/<konu>.md` | Gerektiğinde okunur, başlıklarla taranır |
| Değişen durum (açık PR, bekleyen karar) | `CHECKPOINT.md` | Kalıcı kural değildir, sık güncellenir |
| Her oturumda şart olan kısa özet | Proje talimatları kutusu (`talimat-kutusu-ozet.md`, 4.000 karakterin altı) | Kutu uzayınca uyarı verir |

Boyut sınırları `tests/test_talimat_boyutu.py` ile denetlenir. `@import` bağlam maliyetini düşürmez, bölmek için kullanılmaz.

## Kullanım
- Önce yalnızca ilgili dosyanın özetini ve başlıklarını oku; tamamını açma (token tasarrufu).
- Kural silinmez. Değişiklik gerekiyorsa kullanıcıya önerilir, onaydan sonra eklenir.
- Kısa kutu metni: `docs/kurallar/talimat-kutusu-ozet.md`.
- Bu dosyalar, kasadaki bir nota ayna olarak da eklenebilir (kasa cihazdadır; ekleme kullanıcı onayıyla).

## Birlikte çalışılanlar ve kayıt
- Alt ajan kullanılmadı. Koordinatör oturumu brifi verdi: [İP:Koordinatör#bilinmiyor].
- Kullanılan yapay zeka araçları: ana model Sonnet 5.5; Jev kullanılmadı (bulut oturumunda erişilemedi, "Jev'e erişilemedi").
- Token: tahmini; girdi yaklaşık 60.000, çıktı yaklaşık 12.000 (kesin sayı alınamadı).
