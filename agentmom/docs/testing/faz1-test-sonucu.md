# Faz 1 test sonucu (2026-10-21)
Ortam: Windows, Node v24.21.0 (`D:\n8n\nodejs`), TypeScript 5.9 (yalnız tip denetimi; çalıştırma Node'un yerleşik tür soyma özelliğiyle), `node:test`, `node:sqlite`.

## Çalıştırılan komutlar ve sonuç
| Komut | Sonuç |
|---|---|
| `npm test` (`node --test "src/**/*.test.ts"`) | 72 test, **72 geçti, 0 kaldı**, 0 atlandı (≈0,5 sn). Ham çıktı: `docs/testing/faz1-test-ciktisi.txt` |
| `npm run typecheck` (`tsc --noEmit`, strict + noUncheckedIndexedAccess + erasableSyntaxOnly) | Hata yok |
| Gerçek sunucu duman testi: `node src/server/main.ts` geçici dizinde, `curl` ile | /health 200 yeşil; izin dışı yol 403 + `denied`; `task.create` 201 + `approved`; yanlış Host 403; /api/audit kayıt döndürdü; `audit.jsonl` 2 satır, SQLite dosyası oluştu |

## Modül başına test sayısı
| Modül | Test | Kapsanan davranış |
|---|---|---|
| core/policy | 14 | izin / ret / onay_gerekir; sözleşme süresi; dizin kapsamı (`..`, önek hilesi); ajan kendine izin veremez; ajan kendi onayını veremez; ücretli rotaya sessiz geçiş reddi; ücretli rota onaysız → onay; bütçe; belirlenimcilik |
| core/db (göç) | 7 | boş DB'de ileri uygulama; tekrar uygulamada değişmezlik; yalnız yeni göç; başarısız göç geri alınır; uygulanmış dosya değişirse hata; bütünlük raporu; dosya adı / ardışıklık |
| core/audit | 7 | sır benzeri dizeler (anahtar, jeton, JWT, PEM, Bearer, atama) hem SQLite hem JSONL'de yazılmaz; hassas anahtarlar; `secret_ref` istisnası yalnız yapılandırılmış alan; döngüsel nesne; sink hatası yukarı çıkar |
| core/secrets | 3 | ref biçimi, değer sızmaz |
| core/config | 16 | katman önceliği varsayılan < kullanıcı < proje < yerel; dizi değiştirme / nesne birleştirme; bilinmeyen anahtar / tür hatası; `host` ayarlanamaz; geçersiz JSON sessizce atlanmaz; tutarsız sözleşme; proje ve yerel katman politikayı yalnız daraltabilir (10 genişletme denemesi x 2 katman reddedilir); db / audit yolu veri dizini dışına çıkamaz; veri yolunda symlink / junction reddedilir (gerçek junction ile) |
| core/tasks | 7 | geçerli akış, yeniden deneme, geçersiz geçiş reddi (durum değişmez), terminal durumlar, yalnız kullanıcı onaylar |
| core/health | 5 | migre DB yeşil; migrasyonsuz kırmızı; bozuk dosya kırmızı; olmayan dizin kırmızı; sonda tablosu kalmaz |
| server | 13 | yalnız 127.0.0.1; /health 200 ve bozuk DB'de 503; POST /api/tasks allow / deny / onay; ücretli geçiş; kendine izin veya enjekte onay / aktör 400; doğrulama (JSON, bilinmeyen alan, içerik türü, 64 KB sınır); yanlış Host / Origin 403; denetimde sır yok |

## Test sırasında bulunan ve düzeltilen hatalar
1. Redaksiyon `secret:claude` yazan geçerli `secret_ref` değerini de `secret:[REDACTED]` yapıyordu. İlk çözüm serbest metne muafiyet verdi; otomatik güvenlik incelemesi bunun `secret:hunter2` gibi gerçek bir sırrı sızdırabileceğini bildirdi (geçerli bulgu). Son çözüm: serbest metinde muafiyet yok; yalnız `secret_ref` / `secretRef` alanında ve değerin tamamı ref biçimine uyuyorsa korunur. Regresyon testi eklendi.
2. SQL göç sağlama toplamı Windows'ta CRLF dönüşümüne duyarlıydı; sağlama toplamı satır sonu normalleştirilerek hesaplanıyor ve `.gitattributes` ile `*.sql` LF'e sabitlendi.
3. Otomatik güvenlik incelemesi (ikinci bulgu, geçerli): depo içindeki güvenilmeyen `agentmom.config.json` / `agentmom.local.json` sözleşmeyi genişletebiliyor ve db / audit yolunu dışarı yönlendirebiliyordu. Çözüm: yalnız varsayılan ve kullanıcı katmanı (`AGENTMOM_USER_CONFIG` ile çalışma alanı dışından) genişletebilir; proje ve yerel katman yalnız daraltır, genişletme denemesi sessizce atlanmaz, hata verir; db / audit yolu göreli ve `..` içermeyen olmalı. 4 test eklendi (toplam 64 → 68).
4. Otomatik güvenlik incelemesi (üçüncü bulgu, geçerli): klonlanmış çalışma alanındaki `data` bir symlink / junction ise yazma dışarı yönlenebilirdi. Çözüm: `resolveInsideRoot` yol bileşenlerinde symlink / junction görürse ve gerçek konum kök dışına çıkarsa başlamayı reddeder. 4 test (toplam 68 → 72) ve gerçek junction ile `main.ts` denemesi: reddetti, hedef dizine hiçbir şey yazılmadı.

## Faz 1 kabul kriterleri ile karşılaştırma (faz0-plan.md §6)
| Kriter | Durum |
|---|---|
| `npm test` yeşil | KARŞILANDI (72/72) |
| Göç ileri | KARŞILANDI |
| Göç **geri** | **KARŞILANMADI**: bilerek yalnız ileri göç yapıldı (geri/aşağı göç yok, çalışan DB için yedekten dönüş planlanmadı) |
| Politika birim testleri (izin/ret/onay) | KARŞILANDI |
| Sır içeren log taramasında 0 sızıntı | KISMEN: kayıt katmanı ve API duman testi 0 sızıntı gösterdi; tüm sürecin stdout/stderr günlükleri için ayrı tarama yok |
| /health gerçek denetim yapar | KARŞILANDI |
