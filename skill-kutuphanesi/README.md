# Skill kütüphanesi

GitHub'da en çok yıldız alan 50 skill deposundan toplanan, tekrarları ayıklanmış **1.463 skill** burada duruyor. Claude Code bu klasörü kendiliğinden yüklemez. Yalnızca `.claude/skills/` altındaki skill'ler etkindir. Bunun nedeni şu: Claude Code skill listesine bağlamın yalnızca %1'ini ayırır, bu kadar skill aynı anda etkin olsaydı çoğunun açıklaması düşer ve Claude onları kendiliğinden seçemezdi.

## Kullanım

```bash
scripts/skill-etkinlestir.sh --ara obsidian        # INDEKS.md içinde ara
scripts/skill-etkinlestir.sh humanizer             # .claude/skills altına kopyalar
scripts/skill-etkinlestir.sh sahip__depo/ad        # aynı ad birden çok depodaysa
scripts/skill-etkinlestir.sh --liste               # kütüphaneden etkinleştirilenler
scripts/skill-etkinlestir.sh --kapat humanizer     # kütüphaneden etkinleştirileni kaldırır
```

Tüm skill'lerin listesi ve açıklamaları: [INDEKS.md](INDEKS.md). Her deponun lisansı kendi klasöründeki `KAYNAK-LICENSE` dosyasında (depo düzeyinde lisansı olmayanlarda skill klasörünün içindeki `LICENSE.txt`).

## Nasıl seçildi

Depolar 10 Ekim 2026'da sığ klonlandı. Kurallar sırasıyla:

1. **Etkin olanlar atlandı:** `.claude/skills` altındaki 65 skill zaten etkin olduğu için kütüphaneye tekrar konmadı. (2026-10-25: bunlardan kullanılmayan 59'u Yusuf'un onayıyla kütüphaneye taşındı; `anthropics__skills`, `obra__superpowers`, `kepano__obsidian-skills`, `OthmanAdi__planning-with-files` ve `mattpocock__skills` altında duruyor. `scripts/skill-etkinlestir.sh <ad>` ile geri etkinleştirilir.)
2. **Tekrarlar ayıklandı (83):** Aynı adlı skill birden fazla depoda varsa yalnızca en çok yıldızlı depodaki tutuldu (79). Adı farklı ama içeriği birebir aynı olanlar da atlandı (5; ComposioHQ'nun `artifacts-builder` kopyası dahil). En çok tekrar superpowers-zh (16, superpowers'ın Çince kopyaları), anbeime/skill (16) ve alirezarezvani/claude-skills (21) depolarındaydı.
3. **Başka ajanlar için kopyalar atlandı:** `.gemini`, `.codex`, `.cursor` gibi gizli klasörlerdeki aynı skill'in kopyaları, `i18n` dil sürümleri, ayrıca `tests`, `examples`, `templates` altındaki örnek ve test skill'leri (SkillSpector'ın kasıtlı zararlı test örnekleri dahil) alınmadı.
4. **Lisanssızlar atlandı (86):** Bu depo herkese açık olduğu için lisansı olmayan içerik kopyalanmadı: anbeime/skill (56), ComposioHQ (19), vercel-labs/agent-skills (9), forrestchang/andrej-karpathy-skills (1, ama `karpathy-guidelines` olarak zaten etkin), anthropics/skills doc-coauthoring (1).
5. **Composio uygulama bağlayıcıları atlandı (832):** ComposioHQ deposundaki `composio-skills/*` klasörleri, Composio hesabı gerektiren uygulama otomasyonları. Aynı depodaki docx, pdf, pptx ve xlsx, Anthropic'in kapalı lisanslı skill'lerinin kopyası olduğu için alınmadı; bu yüzden ComposioHQ'dan hiç skill gelmedi.
6. **Anthropic'in docx, pdf, pptx, xlsx ve claude-api skill'leri** lisans ve yerleşik skill çakışması nedeniyle alınmadı.

## Skill'i olmayan depolar

Bu depolarda kurulacak SKILL.md yok: Graphify-Labs/graphify (skill'i kendi CLI aracı üretiyor), VoltAgent/awesome-openclaw-skills, VoltAgent/awesome-agent-skills, travisvn/awesome-claude-skills, BehiSecc/awesome-claude-skills (bağlantı listeleri), agentskills/agentskills (format tanımı). sickn33/agentic-awesome-skills başka depolardan toplanmış 2.675 skill'lik bir katalog olduğu için alınmadı.

## Güvenlik

Kopyalanan dosyalarda frontmatter hook'u, ikili dosya, `curl | sh` ile çalışan betik ve veri sızdırma kalıbı tarandı. Eşleşmeler yalnızca belgelerdeki kurulum örnekleri ve güvenlik skill'lerinin anlattığı saldırı örnekleriydi. Yine de bir skill'i etkinleştirmeden önce `skill-inspector` ile incelemek iyi olur.
