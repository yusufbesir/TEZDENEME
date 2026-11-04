# AgentMom — Faz 0: Keşif, Mimari ve Plan
Tarih: 2026-10-21 · Durum: TASLAK, Yusuf onayı bekliyor · Hiçbir özellik henüz uygulanmadı/çalıştırılmadı.

## 1. Doğrulanmış bulgular (gerçekten incelendi)
- Bulut oturumu: Linux, Node 22.22, npm 10.9, Python 3.13, git 2.43. `sqlite3` CLI yok (Node/Python kütüphanesiyle kullanılır). Chromium + Playwright hazır.
- Cihaz DESKTOP-MR12INL: D:\YusufII, D:\Programlar, D:\n8n bağlı; "served" görünüyor ama bu oturumda cihaz komutu çalıştırılmadı. Cihazdaki gerçek durum (Node, Ollama, Claude/Codex/Gemini CLI kurulu mu) DOĞRULANMADI.
- Depolar: `yusufbesir/TEZDENEME` (proje/kural/notlar, herkese açık), `yusufbesir/yz-merkezi` (özel, eski Yapay Zeka Merkezi), `yusufbesir/yusufii-araclar`. AgentMom için henüz ayrı depo yok.
- Eski YZ Merkezi (yz-merkezi, 8352 satır Python, ~1,4 MB, tek commit görünür): Python HTTP sunucu + Edge `--app` arayüzü; `motorlar/` (claude, codex, gemini komut satırı sarmalayıcıları + `taban.py`), `yonlendirici.py` + `yonlendirme.json`, `hassas.py` (hassas veri taraması), `guvenlik.py`, `jev.py`, `hafiza_kopru.py`, 24 test dosyası, `arastirma/` (4 araştırma notu), `GELISTIRME-NOTLARI.md` (12 fikir: goal döngüsü, kullanım takibi, izin modeli...).
- Proje kuralları: docs/kurallar/ (TEZDENEME) geçerli; Türkçe arayüz/iletişim, İngilizce kod.

## 2. Eski projeden yeniden kullanım kararı
| Parça | Karar | Gerekçe |
|---|---|---|
| Fikirler/araştırma/GELISTIRME-NOTLARI/BENIOKU | KORU (notlar) | Yusuf istedi; OpenCode, harness, Codex araştırması AgentMom'a girdi |
| motorlar/taban.py + 3 CLI motoru | Tasarım referansı; kod TypeScript'e yeniden yazılır | Mimari Python→TS değişiyor; kontrat fikri (hazır/giriş/iptal/akış olayları) taşınır |
| hassas.py, guvenlik.py | Kural listeleri referans; yeniden yazım | Politika motoru arka uçta olmalı |
| yonlendirici.py/yonlendirme.json | Referans (tercih sırası + sınıf modeli) | AgentMom yönlendirme politikası daha geniş |
| masaustu_sunucu.py (2233 satır), siteler.py, pencereler.py, cdp.py | Taşınmaz | Çoklu pencere/web otomasyonu; "tek sağlayıcı sarmalayıcı" anti-desenine yakın |
Not: Python mi TypeScript mi kararı Yusuf'ta (bkz. Karar 2).

## 3. Önerilen mimari (modüler monolit)
Yığın (greenfield; karar kaydı ADR-001..): TypeScript uçtan uca; yerel arka uç (Node 22, Fastify) + React arayüz (Vite); SQLite (`better-sqlite3`, FTS5, göç dosyaları); sırlar için OS kimlik kasası (`keytar` benzeri; Windows Credential Manager) — SQLite'ta yalnız `secret_ref`; git worktree ile izole çalışma; Playwright doğrulama; masaüstü kabuğu (Tauri/Electron) Faz 1 sonunda ölçülerek seçilir, başlangıçta `localhost` + `msedge --app`.
Bağımlılık yönü: UI → API → Orkestrasyon/Politika → Adaptör kontratı → Adaptörler. Politika motoru her adımdan geçer; UI yetki veremez.
Modül sahipliği (kısa): Politika&Orkestrasyon (yetki, yönlendirme, görev yaşam döngüsü) · Sağlayıcı&Ajan Ekosistemi (kayıt, kapasite matrisi, bağlantı) · Agent Runtime (süreç/worktree) · Beyin Verify · Hafıza (SQLite+Obsidian) · Güvenlik&Yapılandırma (sırlar, redaksiyon) · Gözlem&Denetim (audit) · REA. Tam sahiplik matrisi (100 yetenek → tek sahip modül) Faz 0 çıktısı olarak `docs/architecture/yetenek-sahiplik-matrisi.md` dosyasında üretilecek; bu taslakta yalnız ilke.
Adaptör kontratı: sürümlü, tipli opsiyonel işlemler + kapasite beyanı (verified/partial/unverified/unsupported/unavailable, kanıt kaynağı, tarih). Desteklenmeyen işlem açık "capability error" döner, sahte başarı yok.

## 4. Sağlayıcı/ajan entegrasyon stratejisi
Kip A abonelik (resmi CLI girişi), B BYOK, C yerel (Ollama/LM Studio), D uyumlu uç nokta, E harici ajan/IDE. Sıra:
1. Dikey dilim 1: Claude Code CLI (kip A/E; bu cihazda kullanılıyor, kurulu olması doğrulanacak).
2. Dikey dilim 2 (temelden farklı): OpenAI-uyumlu uç nokta / Ollama (kip C/D, HTTP, akışlı, araçsız) — orkestratörü değiştirmeden eklenebildiğini kanıtlar.
3. Sonra: Codex CLI, Gemini CLI, OpenCode; Cursor/VS Code/JetBrains yalnız resmi CLI/eklenti yoluyla ve önce araştırılarak.
Her entegrasyon için kod öncesi araştırma notu (docs/integrations/) ve 15 maddelik test listesi (geçersiz anahtar, ağ hatası, hız sınırı, iptal, redaksiyon, yetkisiz sağlayıcı geçişi yok...).

## 5. Güvenlik ve faturalama risk değerlendirmesi (ilk sürüm)
| Risk | Şiddet | Önlem |
|---|---|---|
| Aboneliğin sessizce ücretli API'ye geçmesi | Yüksek | Yönlendirici tek rota; rota değişimi yeni yetki kararı; ilk ücretli kullanımda açık onay; bütçe sert durdurma |
| Sırların SQLite/log/Git'e sızması | Yüksek | Yalnız secret_ref; redaksiyon katmanı; sırlı testler; anahtarlar klasörüne AI erişimi yok (proje kuralı) |
| Modelin kabuk/dosya erişimi | Yüksek | Politika izin listesi, yol kısıtı, zaman aşımı, süreç izolasyonu, worktree |
| Güvenilmeyen girdi (model çıktısı, MCP, skill) | Yüksek | Şema doğrulama, karantina, yaşam döngüsü onayı; LLM yetki kararı vermez |
| Abonelik şartları/otomasyon sınırı | Orta | Yalnız resmi giriş; kullanım sınırı uyarıları; belirsizse "doğrulanmadı" |
| Eşzamanlı ajanların çakışması | Orta | Worktree + dosya sahipliği + çakışma tespiti |
| Kapsam şişmesi (100 yetenek) | Yüksek | Faz kapıları; dikey dilim kanıtlanmadan genişleme yok |
| Maliyet tahmini uydurma | Orta | "bildirilen" ve "tahmini" ayrı; eksik veri ≠ sıfır maliyet |

## 6. Fazlı plan ve ölçülebilir kabul kriterleri
- Faz 0 (bu belge): sahiplik matrisi, mimari, ADR'ler, risk kaydı, kabul kriterleri. KABUL: Yusuf onayı + 100 yeteneğin tamamı tek modüle eşlenmiş.
- Faz 1 temel: kabuk, arka uç, SQLite göçleri, politika motoru, audit, sır soyutlaması, görev/yürütme durumu. KABUL: `npm test` yeşil; göç ileri/geri; politika birim testleri (izin/ret/onay); sır içeren log taramasında 0 sızıntı; /health gerçek denetim yapar.
- Faz 2 sağlayıcılar: kontrat, kayıt, bağlantı merkezi, 2 farklı adaptör. KABUL: ikinci adaptör orkestratör/politika koduna dokunmadan eklenir (diff kanıtı); 15 sağlayıcı testi her adaptörde çalışır; kapasite matrisi kanıt tarihli.
- Faz 3–9: hedefler şartnamedeki sırayla; her faz sonunda "çalışan / eksik / test edilen / başarısız / sonraki" raporu.
İlk dikey dilim KABUL: Claude Code ile bir görev: yetkilendir → izole worktree'de çalıştır → kanıt topla (diff, log, çıkış kodu) → arayüzde göster; denetim kaydı eksiksiz; yetkisiz rota değişimi reddedilir.

## 7. Açık kararlar (Yusuf)
1. Yeni depo adı/yeri (öneri: özel `yusufbesir/agentmom`) ve eski YZ Merkezi'nin arşivlenmesi.
2. Dil/yığın: TypeScript (öneri, şartname başlangıç noktası) mi, mevcut Python mı?
3. Cihaz keşfi (kurulu CLI'lar, Node, Ollama) için cihaz oturumu başlatma onayı.
4. Masaüstü kabuğu kararı Faz 1 sonuna ertelensin mi?

## 8. Varsayımlar
- Cihaz çevrimiçi ve oturum açılabilir (hafızada 17 Ekim'de çevrimdışı notu var; şimdi "served").
- Tek kullanıcı, yerel-öncelikli, Windows birincil hedef.
