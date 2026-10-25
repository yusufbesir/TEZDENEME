# Entegrasyon: Codex CLI
Sahip modül: M4 (`src/providers/codex.ts`). Tarih: 2026-10-21. Rota: abonelik (ChatGPT girişi).

## Cihaz durumu (gerçek)
- Yol: `D:\Programlar\npm-global\node_modules\@openai\codex\node_modules\@openai\codex-win32-x64\vendor\x86_64-pc-windows-msvc\bin\codex.exe` (`@openai/codex` 0.163.0). Kabuksuz doğrudan çalıştırılır.
- `codex login status` → "Logged in using ChatGPT", çıkış 0. Giriş bu cihazda zaten vardı; belirteç okunmadı.

## Gerçek çalıştırma (bir kez, 2026-10-21)
`codex exec --json --ephemeral -s read-only -C <worktree>`, istem stdin'den ("pong" iste, komut çalıştırma/dosya değiştirme yok). Sonuç: çıkış 0, yanıt `pong`, 23407 giriş / 5 çıkış token, maliyet bildirilmedi (`null`, sıfır değil). Gözlenen olaylar (kayıt `src/providers/testing/codex-real-run.jsonl`): `thread.started`, `turn.started`, `item.completed` (`agent_message` ve bir `error` uyarı öğesi), `turn.completed` (`usage`: input/cached_input/cache_write_input/output/reasoning_output). Not: Codex bu çalıştırmada kendi durum dosyalarını `C:\Users\…\.codex` altında kullanır (aracın normal çalışması; `--ephemeral` oturum kaydını azaltır).

## Kapasite beyanı
execute, streamEvents, collectEvidence, getUsage → **partial** (gerçek çıktı: yalnız başarı yolu, salt-okunur, tek istem). cancel → unverified. Başarısızlık/iptal/zaman aşımı/`workspace-write`/araç olayları **gerçek çıktıyla doğrulanmadı**.

## Sınırlar ve riskler
- Codex araç düzeyinde izin listesi sunmaz; yalnız `read-only | workspace-write | danger-full-access`. Bu yüzden: `danger-full-access`/bypass hiç kullanılmaz; **yazılabilir sandbox, sözleşme kabuğu (`shell.exec`) da vermedikçe başlamadan reddedilir**; salt-okunur yalnız okuma araçlarıyla.
- **Bilinen sınır (karar bekliyor):** Codex'in salt-okunur kipi okumayı çalışma dizinine kısıtlamaz; ajan dosya sisteminin başka yerlerini (oturum belirteci ağacı, audit veritabanı vb.) **okuyabilir**. Ağ salt-okunur kipte kapalıdır ama bu doğrulanmadı. Önlemler: belirteç depo ve worktree dışındaki ayrı ağaçta, ajana belirteç geçirilmez, ajan belirteçleri yalnız görev oluşturabilir. Tam çözüm: işletim sistemi düzeyi dizin kısıtı (ACL) veya Codex izin profili — her ikisi de doğrulanmadı / kullanıcı onayı gerekir.
- Hız sınırı ve kota hataları `rate_limited` olarak sınıflanır (sahte süreçle test edildi, gerçek değil).
