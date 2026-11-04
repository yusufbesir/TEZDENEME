# Faz 3 test sonucu (2026-10-21)
Ortam: Windows, Node v24.21.0 (`D:\n8n\nodejs`), `node:test`, `node:sqlite`. Test geçici dosyaları `data/test-tmp` altında (D:).

## Çalıştırılan komutlar ve sonuç
| Komut | Sonuç |
|---|---|
| `npm test` | **196 test, 196 geçti, 0 kaldı, 0 atlandı** (~40 sn). Ham çıktı: `docs/testing/faz3-test-ciktisi.txt` |
| `npm run typecheck` | Hata yok |
| `bash scripts/e2e-real-codex-workflow.sh` | **Gerçek Codex ile uçtan uca iş akışı** (tek küçük çağrı, salt-okunur `plan` adımı, "pong"): (1) güvenilen olmayan depo → `untrusted_repo_for_unconfined_provider` ile reddedildi, hiçbir Codex süreci başlamadı; (2) güvenilen depo → iş akışı `succeeded`, adım çıktısı `pong`, 1 devir kaydı, kanıt `step:plan` + `workflow`, görev `succeeded`; belirteç audit'te 0 kez geçti |
| Gerçek süreç öldürme (`taskkill /T /F`) | `crash recovery` testi: alt süreç `implement` adımında öldürüldü, iş akışı `running` kaldı, `recoverAll()` kaldığı adımdan devam etti |

## Test sayıları (modül)
| Modül | Test |
|---|---|
| core/policy | 16 |
| core/db (göç ileri/geri) | 11 |
| core/audit | 7 |
| core/secrets | 9 |
| core/config | 16 |
| core/tasks | 7 |
| core/health | 5 |
| core/auth | 6 |
| providers | 60 |
| server | 32 |
| **workflows (yeni)** | **27** |
| **Toplam** | **196** (Faz 2'de 163; bu fazda +33) |

## Faz 3 istekleri ve kanıt
| İstek | Durum | Kanıt |
|---|---|---|
| Görev sözleşmesi + kabul kriterleri alanları | Tamam | `task_contracts` (göç 005), `validateContract` (hedef, 1–20 kriter, benzersiz kimlik, yazma kapsamları, kısıtlar), `POST /api/tasks/:id/contract` |
| Sıralı çok ajanlı iş akışı (planla → uygula → bağımsız inceleme → doğrulama), tek tanım | Tamam | `WorkflowDefinition`, tam akış testi; planlayıcı/inceleyici salt-okunur, yalnız uygulayıcı yazılabilir sandbox; doğrulama **deterministik** (model karar vermez) |
| Bağımsız inceleme | Tamam | tanım doğrulamasında ve çalışma anında: inceleyici uygulayıcıyla aynı sağlayıcı olamaz (`allowSameProviderReview` açık bayrağı olmadıkça) |
| Kontrol noktası / kurtarma | Tamam | her adım geçişi SQLite'a yazılır; `recoverAll()`; yarıda kalan deneme `interrupted` olur ve **deneme bütçesinden sayılır**; biten adımlar yeniden çalışmaz; **gerçek süreç öldürme** testi geçti |
| Kontrollü yeniden deneme | Tamam | sağlayıcı başına en çok 1–3 deneme; yalnız geçici hatalar (hız sınırı, ağ, zaman aşımı, süreç, bozuk çıktı) yeniden denenir; `auth_required` ve kapsam ihlali denenmez |
| Sağlayıcı değişimi = yeni yetki kararı | Tamam | yedek sağlayıcıya geçişte `provider.switch` politikadan geçer ve audit'e yazılır; ücretli rotaya geçiş `silent_paid_switch` ile reddedilir ve ücretli sağlayıcı hiç çağrılmaz |
| Ajan görev devri sözleşmesi | Tamam | `Handoff` (sürüm, kimden/kime, hedef, kriterler, kapsamlar, bulgular, açık sorular); önceki ajan çıktısı **güvenilmeyen veri**: rastgele nonce'lu işaretçiler arasında tek satır JSON; sırlar maskelenir; boyut sınırı |
| Eşzamanlı çalıştırma ≤ 3 | Tamam | semafor, sert üst sınır 3 (10 istense de 3); 6 iş akışı testinde hem motor hem sağlayıcı tepe eşzamanlılığı ≤ 3 ve en az 2 |
| Worktree çakışma tespiti | Tamam | yazma kapsamı talepleri (`scope_claims`): aynı depoda örtüşen kapsam → ikinci iş akışı hızlıca `scope_conflict`; ayrık kapsam paralel çalışır; tamamlanınca talep bırakılır; ayrıca kapsam dışı değişiklik `scope_violation` (taşıma/yeniden adlandırma dahil) |
| Gerçek model çağrısı yalnız Codex, minimum | Yapıldı | bu faz: 1 gerçek Codex çağrısı (yukarıdaki betik). Claude Code ve Gemini: giriş yok / kapalı → yalnız sahte süreç |

## Doğrulama düzeyi
| Alan | Düzey |
|---|---|
| İş akışı motoru, kurtarma, yeniden deneme, çakışma, devir | Gerçek kodla; adaptörler **süreç içi sahte** (`ScriptedAdapter`), yani sağlayıcı davranışı senaryodur |
| Çökme kurtarma | Gerçek süreç öldürmeyle (sahte sağlayıcı) |
| Codex ile tek adımlı iş akışı | Gerçek çıktıyla (yalnız `plan` adımı, salt-okunur) |
| Codex `implement`/`review` adımları, çok adımlı gerçek iş akışı | **Gerçek çıktıyla doğrulanmadı** |
| Claude Code, Gemini iş akışı adımları | **Doğrulanmadı** (yalnız sahte) |
| Review JSON'unun gerçek modellerde kararlılığı | **Bilinmiyor**: istem JSON ister, ayrıştırıcı toleranslı ama gerçek modellerle ölçülmedi |

## Güvenlik incelemesi bulguları (hepsi geçerli bulundu, düzeltildi, testli)
1. Görev onayı ücretli rota onayı sayılıyordu (kullanıcı görevi onaylayınca sessiz ücretli geçiş "onaylı" olabilirdi). Artık ücretli rota onayı ayrı açık bayrak (`approval.paidRoute`) veya sözleşme gerektirir.
2. İş akışında depo yolu, git depoya dokunmadan önce politikadan geçmiyordu → worktree'den önce her birinci tercih sağlayıcı için tam yetkilendirme; HTTP ucu da `file.read` kapısından geçirir.
3. Git yeniden adlandırma tespiti, kapsam dışından kapsam içine taşınan dosyanın kaynağını gizliyordu → `--no-renames`.
4. Devir işaretçileri sahtelenebilirdi → rastgele nonce + tek satır JSON.
5. (Faz 2'den) okuma kısıtsız sağlayıcılar için güvenilen-depo kuralı (`docs/security/codex-okuma-kapsami.md`).
