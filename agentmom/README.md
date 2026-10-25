# AgentMom

Yerel öncelikli yapay zeka orkestrasyon platformu. Bu klasör AgentMom işinin depodaki yeridir (Yusuf 2026-10-25: notlar yalnız bilgisayardaki kasada, geri kalan her şey depoda).

## Çalışma düzeni
- İş kalemleri GitHub issue'larıdır (etiket: `agentmom`). Sıradaki iş, açık issue listesinden alınır; iş bitince issue kapanır.
- Her dilim için PR açılır, testler ve typecheck yeşil olmadan "Doğrulandı" denmez.
- Kaynak kod bu klasördedir (#50). Kaynak: özel `yusufbesir/agentmom` deposu (main 7bb4483 + PR #1, cihazda kalan 24 Ekim değişiklikleri).
- Durum kaynağı: `docs/status/100-yetenek-durum.json` (30 Doğrulandı, 59 Kısmi, 9 Planlı, 2 Kapsam dışı; 2026-10-25).
- Kurallar: ADR-016 (yetenekler çağrılan araçtır), Jev/REA için yeni geliştirme yok, kalıcı silme yok.

## AgentMom'un kendi README'si (yusufbesir/agentmom)

AgentMom, yerel-öncelikli bir yapay zeka orkestrasyon platformudur: Claude Code, Codex ve Gemini gibi komut satırı ajanlarını ve yerel modelleri tek bir çekirdek altında toplar, katmanlı ayarlar, izin kipleri ve oturum kayıtlarıyla görevleri güvenli biçimde dağıtır. Bu depo Faz 0 (keşif ve tasarım) aşamasındadır. [İP:AgentMom Faz 0]


## Geliştirme (Faz 1)
`npm install`, `npm test`, `npm run typecheck`, `npm start` (yalnız 127.0.0.1:8787). Node 24 gerekir. Durum: `docs/status/durum.md`, test sonucu: `docs/testing/faz1-test-sonucu.md`. Politikayı genişleten ayarlar yalnız `AGENTMOM_USER_CONFIG` ile gösterilen, çalışma alanı dışındaki dosyadan okunur.

## Faz 2
Sunucu, oturum belirtecini `agentmom-state/token/session.token` dosyasına yazar (depo ve `data/` dışında; `AGENTMOM_STATE_DIR` ile değişir) ve `/api/*` için `Authorization: Bearer <belirteç>` ister. Sağlayıcı CLI'larının yolları `src/providers/*.ts` içinde sabittir (`D:\Programlar\npm-global`, `D:\n8n\nodejs`). Elle doğrulama betikleri: `scripts/real-check.ts`, `scripts/e2e-real-codex.sh` (gerçek Codex çağrısı yapar, abonelik kotası kullanır). Durum: `docs/status/durum.md`.
