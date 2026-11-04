# Faz 2 test sonucu (2026-10-21)
Ortam: Windows, Node v24.21.0 (`D:\n8n\nodejs`), `node:test`, `node:sqlite`, TypeScript 5.9 (yalnız tip denetimi). Tüm test geçici dosyaları `data/test-tmp` altında (D:).

## Çalıştırılan komutlar ve sonuç
| Komut | Sonuç |
|---|---|
| `npm test` | **163 test, 163 geçti, 0 kaldı, 0 atlandı** (~11 sn). Ham çıktı: `docs/testing/faz2-test-ciktisi.txt` |
| `npm run typecheck` (`tsc --noEmit`, strict) | Hata yok |
| `node scripts/real-check.ts connection` | Claude Code 2.1.306: `reachable`, `authenticated: false` (giriş yok). Codex 0.163.0: `reachable`, `authenticated: true` |
| `node scripts/real-check.ts codex-run` | **Gerçek Codex çalıştırması** (ChatGPT girişi, salt-okunur sandbox, "pong"): başarılı, çıkış 0, 23407 giriş / 5 çıkış token (raporlanan), maliyet `null` |
| `bash scripts/e2e-real-codex.sh` | **Uçtan uca gerçek akış**: HTTP → oturum belirteci → görev → politika → izole worktree → gerçek Codex → olaylar audit'e → kanıt → `/api/tasks/:id/evidence`. Görev `succeeded`; kanıt türleri `diff, execution, usage, output`; audit eylemleri `run.started … run.finished`; belirteç audit çıktısında 0 kez geçti |
| Gerçek Credential Manager testleri (`src/core/secrets/credman.test.ts`) | 6 test geçti; yalnız kendi `agentmom:test-*` girdisi yazıldı/okundu/silindi, sonda kalan `agentmom:` girdisi yok |

## Test sayıları (modül)
| Modül | Test |
|---|---|
| core/policy | 14 |
| core/db (göç ileri **ve geri**) | 11 |
| core/audit | 7 |
| core/secrets (bellek + gerçek Credential Manager) | 9 |
| core/config | 16 |
| core/tasks | 7 |
| core/health | 5 |
| core/auth | 6 |
| providers (sözleşme, 3 adaptör, kayıt defteri, sandbox) | 60 |
| server (kimlik doğrulama, onay, çalıştırma, kanıt, güvenlik) | 28 |
| **Toplam** | **163** (Faz 1'de 72; bu fazda +91) |

## Sağlayıcı testleri (şartnamedeki 15 maddeden uygulanabilenler, her adaptörde)
Geçersiz kimlik (`auth_required`), hız sınırı, ağ hatası, zaman aşımı (süreç ağacı öldürülür), iptal, bozuk çıktı (son sonuç yoksa hata; çevresindeki çöp satırlar tolere), çıktı boyutu sınırı, sıfır olmayan çıkış, eksik yürütülebilir dosya (`unavailable`), desteklenmeyen kapasite (`CapabilityError`), sır redaksiyonu (olay, kanıt, özet), API anahtarı ortam değişkenlerinin çocuk sürece **geçirilmemesi**, izin bayraklarının politikadan türetilmesi ve hiçbir bypass bayrağı olmaması, `dispose` ile çalışanların iptali, geç abone olay tamponu, yetkisiz sağlayıcı geçişi ve onaysız ücretli rota reddi (orkestratör düzeyinde). Uygulanmayanlar: kota/maliyet sınırının canlı doğrulaması, çoklu eşzamanlı çalıştırma baskısı, gerçek ağ kesintisi.

## Faz 2 kabul kriterleri (faz0-plan.md §6)
| Kriter | Durum | Kanıt |
|---|---|---|
| İkinci adaptör orkestratör/politika koduna dokunmadan eklenir | **KARŞILANDI** | `git diff c3c8167 4e09bd4` Gemini commit'i yalnız `providers/gemini.ts`, `providers.test.ts`, `fake-cli.mjs`, `server/main.ts` (kayıt 2 satır) dosyalarını değiştirdi. `src/orchestrator`, `src/core`, `src/server/app.ts`, `contract.ts`, `cli-adapter.ts`, `registry.ts`, `policy-map.ts` için `git diff --quiet` = **özdeş**. Ayrıca CLI olmayan süreç-içi bir adaptör testte yalnız kayıtla çalıştırıldı |
| 15 sağlayıcı testi her adaptörde çalışır | **KISMEN** | Uygulanabilir olanlar Claude Code, Codex, Gemini için aynı tablodan döngüyle çalışıyor (üçü 163 testin içinde); sahte süreç (fixture) ile, bkz. aşağıdaki doğrulama düzeyi |
| Kapasite matrisi kanıt tarihli | **KARŞILANDI** | `capabilities` tablosu: durum + kanıt kaynağı + tarih; `/api/providers` ile görülür |
| Göç ileri/geri (Faz 1'den kalan) | **KARŞILANDI** | `rollback()` + her göç için `.down.sql`; 4 test (geri alma, yeniden ileri, eksik down dosyası, sahipsiz down dosyası) |

## Doğrulama düzeyi (neye ne kadar güvenilir)
| Alan | Düzey |
|---|---|
| Politika, göç, audit, kimlik doğrulama, görev durumu, orkestratör, evidence uçları | Gerçek kodla test edildi |
| Windows Credential Manager (yaz/oku/sil, yalnız `agentmom:`) | **Gerçek sistemle doğrulandı** |
| Codex `exec --json` başarı yolu (salt-okunur, tek istem) | **Gerçek çıktıyla doğrulandı** (kayıt: `src/providers/testing/codex-real-run.jsonl`) |
| Codex başarısızlık / iptal / zaman aşımı / `workspace-write` / araç olayları | Yalnız sahte süreç; **gerçek çıktıyla doğrulanmadı** |
| Claude Code `stream-json` olayları | Yalnız sahte süreç; **gerçek çıktıyla doğrulanmadı** (D:\ altındaki CLI girişli değil) |
| Gemini CLI (tüm yürütme yolu) | Yalnız sahte süreç; **gerçek çıktıyla doğrulanmadı**, hiçbir model çağrısı yapılmadı |
| Kimlik durumu: Claude, Codex | Gerçek `auth status` / `login status` ile; Gemini için durum komutu yok → `authenticated: null` |

## Test sırasında bulunan ve düzeltilen hatalar / güvenlik bulguları
1. Sandbox: Bash yalnız yazma yetkisiyle birlikte verilir; Codex araç düzeyinde kısıt ifade edemediği için yazılabilir sandbox'ı kabuk yetkisi olmadan **başlamadan reddeder** (`sandbox_not_enforceable`); Claude `--tools` ile yerleşik araçları da sınırlar.
2. Claude Code'da doğrulanmış OS düzeyi izolasyon olmadığından Bash tamamen reddedilir.
3. Oturum belirteci dosyası depo ve `data/` dışına, worktree ağacından ayrı bir ağaca taşındı; belirteç değerleri audit/kanıt redaksiyonunda tam değerle maskelenir; ajan belirteçleri yalnız görev oluşturabilir, okuma uçları (görev, audit, sağlayıcı, kanıt) yalnız kullanıcıya açık.
4. Git, ajan yazılabilir worktree'deki `.git` işaretçisine güvenmez: git dizini ajan çalışmadan önce çözülüp sabitlenir (`GIT_DIR`/`GIT_WORK_TREE`), `--no-ext-diff --no-textconv`, `core.hooksPath` boş, `core.fsmonitor=false`. Düşman sağlayıcı testi (olumlu kontrolle: sabitleme olmadan filtre gerçekten çalışıyor) geçti.
5. Gemini: `plan` kipi, çalışma dizinindeki araç / eklenti / MCP ayarlarının kısıtlandığını kanıtlamadığı için (güvenlik incelemesi) yürütme **varsayılan olarak kapalı** (`unavailable`, `execute()` `CapabilityError`); yalnız testler `allowUnverifiedExecution` ile açar.
6. Test dosyaları sistem geçici dizininde (C:) kalıyordu; `data/test-tmp`'ye taşındı (Faz 1'den kalan ~100 dizin için bkz. durum.md).
