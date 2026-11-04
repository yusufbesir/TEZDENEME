<!-- Sahip: Claude [İP:AgentMom Faz 5]. Faz 5 test sonucu. Değişiklik: yalnız ekleme/düzeltme, kural silinmez. -->
# Faz 5 test sonucu (2026-10-21)

## (a) Gerçek çok adımlı iş akışı denemesi — GERÇEK ÇIKTI
Depo: `D:\YusufII\Projeler\agentmom-deneme` (insan yazımı güvenilir testler `slugify.test.ts`, saplama `src/slugify.ts`; yazma kapsamı yalnız `src/`; `requireTrustedTests`).
Akış: plan **Claude Code** (`--safe-mode`, abonelik) → uygula **Claude Code** (acceptEdits) → bağımsız inceleme **Codex** (farklı sağlayıcı) → **Beyin Verify** (yerel test koşucusu). Betik: `scripts/e2e-real-faz5-trial.sh`. Kanıt: `faz5-gercek-deneme-wf.json`, `faz5-gercek-deneme-delivery.json`.

| Adım | Sağlayıcı | Giriş tok. | Çıkış tok. | Not |
|---|---|---|---|---|
| plan | claude-code | 23.219 | 1.165 | liste fiyatı eşdeğeri 0,030 $ (ücret değil) |
| uygula | claude-code | 21.845 | 924 | `src/slugify.ts` değişti |
| inceleme 1 | codex | 77.350 | 515 | **c3 karşılanmadı** dedi |
| uygula (onarım turu 1) | claude-code | 22.791 | 810 | |
| inceleme 2 | codex | 75.935 | 390 | onayladı |
| **Toplam** | | **221.140** | **3.804** | 5 gerçek model çağrısı (hedef ≈4; onarım turu 1 fazladan) |

Sonuç: iş akışı `succeeded`, teslim `passed` (4/4 kriter, 4/4 test, 2 tur), önceki turlarda tüm kayıtlarda belirteç 0.

**Dürüst bulgular (gerçek çıktıdan):**
1. **İlk Codex bulgusu YANLIŞ POZİTİF.** "Regex karakter sınıfında U+FFFD var" dedi; oysa saklanan diff'te U+FFFD yok (0), dosya doğru Türkçe harfler içeriyor ve 1. turda 4/4 test geçmişti. Olası neden: Codex'in Windows kabuğunun UTF-8 olmayan görünümü. Aynı dosyayı 2. turda onayladı → inceleyici **kararsız** (tek inceleyiciye güvenilmez; testler karar verici).
2. **Uygulayıcının onarım beyanı yanlış.** "Tüm harfleri `\u` kaçışına çevirdim" dedi; ama dosya git blob'u (`5be671d`) 1. turla **birebir aynı**. Kanıt modelin beyanından değil `git diff`'ten geldiği için yakalandı. Özetler kanıt sayılmaz.
3. Onarım koordinatörü, inceleme reddini tek tur geri besleme olarak uyguladı (plan tekrarlanmadı); teslim denetçisi 2. turda `passed` dedi.
4. Gerçek çıktıdan test: `codex-real-review-verdicts.json` (yanlış pozitif + onay) ayrıştırıcıdan geçer.

**Gerçek hata / zaman aşımı / iptal** (`node scripts/real-check.ts claude-edge <tür>`, neredeyse sıfır token):
- `badmodel`: çıkış 1, `failed`, `api_error` 404 `model_not_found`, token 0. Fixture: `claude-real-badmodel.jsonl` + test.
- `timeout` (1,5 sn): süreç öldürüldü, `timed_out`, `result` satırı yok (kullanım bilinmiyor).
- `cancel`: `cancelled`. İkisinde yalnız `system/init` geldi.

**Yetenek matrisi (güncel):** Claude `execute/stream/evidence/usage` = partial (gerçek: pong, çok adımlı yazma, hata/zaman aşımı); `cancel` = partial (gerçek: başlamış süreç iptali; yanıt ortası iptal gözlenmedi); araç olayları (tool_use) ayrıntısı doğrulanmadı. Codex `execute` = partial (gerçek: salt-okunur inceleme ×2); başarısızlık/iptal/workspace-write doğrulanmadı. Gemini: giriş tamam, Google istemciyi reddediyor → `unavailable`.

## (b) Bellek (FTS5 + Obsidian dışa aktarma) — `src/memory`, migrasyon 007
Alanlar: kaynak, zaman (gözlem/kayıt/geçerlilik), güven, kapsam, konu; bayraklar: `contradiction` (aynı kapsam+konu, farklı içerik, birbirini değiştirmeyen — otomatik çözülmez, yalnız kişi çözer), `stale`/`expired` (tür başına gün: olgu 90, karar 365, olay 30, not 180, sonuç 60), `low_confidence` (<0,5). Salt-ekleme (SQL tetikleyici), düzeltme = yeni kayıt (`supersedes`). Arama: Türkçe katlama (ı/İ/ş…), ≥3 harfli belirteçler ön ek eşleşir, kullanıcı sorgusu FTS söz dizimine ulaşmaz. Dışa aktarma: `wx` ile yalnız yeni dosya (varsa atlanır, üzerine yazılmaz), `anahtarlar` klasörü sert ret, dizin önceden var ve gerçek (symlink/junction yok), `file.write` politika kapısı + kullanıcı onayı, gövde çitli ve Templater etiketi etkisiz.
Testler: `memory.test.ts` 14, `app.test.ts` 2 yeni.

## (c) Beceri yaşam döngüsü iskeleti — `src/skills`, migrasyon 008
candidate → researching → security_review → isolated_test → awaiting_approval → released (sürümlü); çıkışlar rejected/revoked. Kapılar kanıt kayıtlarıdır, artefakt SHA-256'ya bağlıdır; ayrıcalıklı/uzak risk sınıfı ≥2 farklı güvenlik denetçisi ister; öneren kendi denetimini geçemez (kimlik normalize edilir); yayınlama/ret/iptal yalnız kullanıcı. **Hiçbir üçüncü taraf beceri indirilmez/kurulmaz/çalıştırılmaz**; modül dosya/ağ/süreç API'si içe aktarmaz (kaynak testi bunu sabitler).
Testler: `lifecycle.test.ts` 12, `app.test.ts` 1 yeni.

## Bağımsız güvenlik denetimi (guvenlik-denetcisi, Sonnet)
Sonuç GEÇTİ (kritik/yüksek yok). Orta ×4 ve düşük ×1 düzeltildi (kimlik normalizasyonu; subject/scope/resolvedBy maskeleme; gövde çitleme; tetikleyici açıkları: `id`, durum geri dönüşü, `INSERT OR REPLACE`; `realpathSync.native`). Kabul edilen: belirteç curl komut satırında (yerel döngü, dosyaya yazılmaz); denetim kaydı alanları kayıt anında maskeleniyor. Kanca uyarıları (`UPDATE skill` = SQL durum güncellemesi; `new Function` = test metnindeki regex) yanlış pozitif.

## Tam paket
`npm test` ve `npm run typecheck`: bkz. `faz5-test-ciktisi.txt` (son koşu).
