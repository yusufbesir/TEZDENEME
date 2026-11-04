# Faz 4 test sonucu (2026-10-21): Beyin Verify çekirdeği
Ortam: Windows, Node v24.21.0, `node:test`, `playwright-core` 1.64.1 (D:'ye npm ile; tarayıcı indirilmedi) + kurulu Microsoft Edge. Docker YOK (Yusuf, 2026-10-21): yalıtım yalnız git worktree + yerel süreç + Node izin modeli.

## Çalıştırılan komutlar ve sonuç
| Komut | Sonuç |
|---|---|
| `npm test` | **269 test, 269 geçti, 0 kaldı, 0 atlandı** (~142 sn). Ham çıktı: `docs/testing/faz4-test-ciktisi.txt` |
| `npm run typecheck` | Hata yok |
| Gerçek tarayıcı koşuları (Edge, yerel sayfa) | 11 senaryo geçti: kriter etiketli kontroller, ekran görüntüsü (PNG imzası + hash + D: yolu doğrulandı, görüntü gözle de incelendi: "clicked" durumu çizilmiş, dış resim engellenmiş), dış istek ve WebSocket engeli, başarısız kontrolde hata ekran görüntüsü, kayıp öğe, dotfile/`\`/`%zz` yolları, başlatma hatası, zaman aşımı, iptal |
| Gerçek yerel test koşuları (`node --test`, izin modeliyle) | geçen/kalan/atlanan, flaky (yeniden deneme), ortam hatası, zaman aşımı, iptal, sır maskeleme, TypeScript test dosyası, izin modeli reddi (dış okuma, çalışma alanı yazma, süreç başlatma, symlink oluşturma) |
| İş akışı entegrasyonu (gerçek testler + sahte sağlayıcı) | teslim PASSED, zayıf eşleme UNVERIFIED, onarım turu, onarım bütçesi, ortam hatası onarılmaz, inceleyici reddi, yetkisiz doğrulama, tarayıcı doğrulaması iş akışında |

## Test sayıları (modül)
| Modül | Test |
|---|---|
| core/policy | 17 |
| core/db | 11 |
| core/audit | 7 |
| core/secrets | 9 |
| core/config | 17 |
| core/tasks | 7 |
| core/health | 5 |
| core/auth | 6 |
| providers | 62 |
| server | 33 |
| workflows | 43 |
| **verify (yeni)** | **50** |
| **Toplam** | **269** (Faz 3'te 196; bu fazda +73) |

## Faz 4 istekleri ve kanıt
| İstek | Durum | Kanıt |
|---|---|---|
| Sürümlü ortak doğrulama sonuç şeması (koşu, test, kanıt, sınıflandırma, sağlayıcıya özgü kanıt) | Tamam | `src/verify/schema.ts` (sürüm 1) + `validateRunResult`; `providerData` ve kanıt dosyaları korunur; şema ihlalleri testli |
| Yerel test koşucusu (node:test → yapılandırılmış sonuç, zaman aşımı, iptal) | Tamam | `LocalTestProvider`; JUnit ayrıştırma; her test dosyası kendi süreçte |
| Playwright tarayıcı doğrulama sağlayıcısı (D:, Edge, ekran görüntüsü kanıtı) | Tamam | `BrowserProvider` + `browser-worker.ts`; bildirimsel senaryo; kanıt D:'de, SHA-256'lı |
| Başarısızlık sınıflandırması product_defect / environment / flaky / infra | Tamam | `classify.ts` deterministik; açıklanamayan = product_defect (güvenli yön) |
| TEK onarım koordinatörü; yalnız ilk başarısızlık implement'e döner; sınırlı tur | Tamam | `RepairCoordinator` (varsayılan 2, sert üst sınır 3); motor tek koordinatör alır; plan tekrarlanmaz; testle: yalnız ilk başarısızlık geri bildirimde |
| Kabul kriteri izlenebilirliği (kriter kimliği → test sonucu) | Tamam | `traceCriteria`; `[ac:<id>]` etiketi veya açık eşleme |
| Zayıf test uyarısı: geçti ama eşlemesiz = "doğrulanmadı" | Tamam | testli: yeşil koşu + eşlemesiz kriter → `unverified`/`weak`, iş akışı başarısız, onarıma gitmez |
| Kanıt tamlık denetimi | Tamam | `auditEvidence`: şema, toplamlar, durum tutarlılığı, günlük kanıtı, her başarısız test için kanıt, dosya var/boyut/hash |
| Bağımsız teslim denetçisi (Faz 3 incelemesi + doğrulama → geçti/kaldı) | Tamam | `auditDelivery`: ham sonuç + dosyalardan karar verir; passed / failed / unverified; uygulayıcının iddiasına güvenmez |

## Doğrulama düzeyi
| Alan | Düzey |
|---|---|
| Yerel test koşucusu, tarayıcı sağlayıcısı | **Gerçek**: gerçek `node --test`, gerçek Edge |
| Teslim denetçisi, izlenebilirlik, tamlık, onarım | Gerçek kodla, gerçek kanıt dosyalarıyla |
| İş akışı + doğrulama | Gerçek test/tarayıcı koşuları, ancak uygulayıcı/inceleyici **sahte sağlayıcı** (senaryo). Gerçek Codex/Claude/Gemini ile uçtan uca Faz 4 doğrulaması **yapılmadı** (Claude/Gemini girişi yok; Faz 4'te model çağrısı istenmedi) |
| Başka dil/çerçeve (pytest, jest...) | Yok; yalnız Node test koşucusu |
| Dış hizmet (TestSprite vb.) | Kullanılmadı: veri dışarı gitmedi |

## Güvenlik incelemesi (bağımsız denetçi ajan + otomatik inceleme): bulgular ve çözüm
İlk denetçi sonucu **Kaldı** (2 Yüksek, 4 Orta, 2 Düşük); tümü düzeltildi ve testlendi, ardından otomatik incelemenin 3 ek bulgusu da:
1. (Yüksek) Test, kendi sürecinin stdout'una sahte JUnit yazıp `exit(0)` ile gerçek başarısız testleri bastırabilirdi → **her test dosyası kendi sürecinde**; çıkış kodu ile rapor tutarsızsa sonuç güvenilmez (`error`/infra); dosya yalnız kendi adına konuşur.
2. (Yüksek) Çalışma alanındaki symlink/junction izin modelini ve statik sunucuyu aşabilirdi → koşu öncesi ve **her süreç öncesi yeniden** tüm ağaç taranır (`.git` dahil, çoklu sabit bağlı dosyalar dahil, scratch dahil); statik sunucuda `realpath` kontrolü; Node `fs.symlink`'i izin modelinde zaten yasaklar (testle doğrulandı).
3. (Orta) Plan var ama sağlayıcı yok → eski zayıf kontrole düşüyordu → **kapalı-hata** (`verification_unavailable`).
4. (Orta) Dosya adı `-` ile başlayıp node seçeneği olabilirdi → `./` öneki + `-` ile başlayan bileşenler reddi.
5. (Orta) `[ac:..]` etiket şişirme (tek test, tüm kriterler) → test başına en çok 3 kriter, aşan test yok sayılır ve raporlanır; ajanın kendi yazdığı testler rapora uyarı olarak yazılır, `requireTrustedTests` ile kanıt sayılmaz; karşılaştırma yol/büyük-küçük harf normalize.
6. (Orta, olası) Tarayıcıda WebSocket / service worker / DNS ön-bağlantısı → `serviceWorkers: "block"`, `routeWebSocket` engeli, `--host-resolver-rules` ile yalnız 127.0.0.1; testle fetch ve WebSocket engeli doğrulandı.
7. (Düşük) `\` ve bozuk `%zz` yolları; ad redaksiyonu ve uzunluk sınırı → düzeltildi, testli.

## Bilinen sınırlar
- Node izin modeli **sert sandbox değildir** ve ağı kısıtlamaz: test kodu ağdan veri gönderebilir. Docker ertelendi; çözüm yalnız ileride OS düzeyi izolasyon (bkz. elevated sandbox planı, Codex için) veya ağsız çalıştırma.
- Doğrulama, ajanın yazdığı testlerin kalitesine bağlıdır: etiket kuralı, sınırlar ve `requireTrustedTests` zayıflığı azaltır, ortadan kaldırmaz. Kriteri gerçekten kanıtlayan test, insan yazımı veya incelenmiş olmalı.
- Tarayıcı doğrulaması küçük bildirimsel senaryolardır (git, tıkla, doldur, metin/görünürlük, ekran görüntüsü); piksel karşılaştırma, erişilebilirlik, görsel kalite kapısı sonraki aşamalar.
