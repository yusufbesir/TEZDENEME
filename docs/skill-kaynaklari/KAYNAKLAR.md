# Projeye eklenen skill'lerin kaynakları

`.claude/skills/` altındaki skill'ler aşağıdaki depolardan 10 Ekim 2026'da kopyalandı. Claude Code bu klasördeki skill'leri proje açıldığında kendiliğinden yükler.

| Depo | Commit | Lisans | Eklenen skill'ler |
|---|---|---|---|
| [anthropics/skills](https://github.com/anthropics/skills) | `dbd4588` | Apache 2.0 (her skill'in kendi `LICENSE.txt` dosyasında) | academy-guide, algorithmic-art, brand-guidelines, canvas-design, discernment-nudge, doc-coauthoring, frontend-design, internal-comms, mcp-builder, skill-creator, slack-gif-creator, theme-factory, web-artifacts-builder, webapp-testing |
| [obra/superpowers](https://github.com/obra/superpowers) | `bb92a77` | MIT | brainstorming, diagnosing-superpowers, dispatching-parallel-agents, executing-plans, finishing-a-development-branch, receiving-code-review, requesting-code-review, subagent-driven-development, systematic-debugging, test-driven-development, using-git-worktrees, using-superpowers, verification-before-completion, writing-plans, writing-skills |
| [mattpocock/skills](https://github.com/mattpocock/skills) | `49dd158` | MIT | ask-matt, codebase-design, diagnosing-bugs, domain-modeling, grill-me, grill-with-docs, grilling, handoff, implement, implement-spec, improve-codebase-architecture, mp-code-review, pr, prototype, research, retro, setup-matt-pocock-skills, tdd, teach, to-questionnaire, to-spec, to-tickets, triage, wait-what, wayfinder, wizard, writing-for-agents |
| [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills) | `3ccff53` | MIT | defuddle, json-canvas, knap, obsidian-bases, obsidian-cli, obsidian-markdown |
| [OthmanAdi/planning-with-files](https://github.com/OthmanAdi/planning-with-files) | `7056ed2` | MIT | planning-with-files |
| [NVIDIA/SkillSpector](https://github.com/NVIDIA/SkillSpector) | `5edc347` | Apache 2.0 | skill-inspector |

Lisans metinleri `lisanslar/` klasöründe.

## Yapılan değişiklikler

- mattpocock/skills içindeki `code-review`, Claude Code'un yerleşik `/code-review` komutuyla çakışmasın diye `mp-code-review` olarak yeniden adlandırıldı (klasör adı ve `name:` alanı).
- Bunun dışında dosyaların içeriği değiştirilmedi.

## Bilerek eklenmeyenler

- **anthropics/skills içindeki docx, pdf, pptx, xlsx:** Açık kaynak değil, "source-available" lisanslı; depoya kopyalanıp dağıtılamaz. Claude uygulamalarında zaten yerleşik olarak var.
- **anthropics/skills içindeki claude-api:** Claude Code'da yerleşik `claude-api` skill'i var, çakışmasın diye eklenmedi.
- **mattpocock/skills içindeki misc/ ve in-progress/ klasörleri:** Yazarın eklenti listesinde yok, deneysel.
- **planning-with-files'ın dil sürümleri (de, ar, es, zh, zht):** Yalnızca İngilizce ana sürüm eklendi.
- **AgriciDaniel/claude-obsidian:** Skill'leri, deponun kendi Python aracı ve hook'larıyla birlikte çalışıyor ve ayrı bir Obsidian kasası istiyor. Yalnızca skill dosyalarını kopyalamak onu bozar. Kurulumu: depoyu klonla, `python3 scripts/claude-obsidian.py init <kasa-yolu>` ile kasayı hazırla, kasa klasöründen `claude --plugin-dir <klon-yolu>` ile başlat.
- **agentskills/agentskills:** Skill değil, Agent Skills formatının spesifikasyonu. Skill yazarken başvuru kaynağı: https://agentskills.io
- **NVIDIA/SkillSpector aracı:** `skill-inspector` skill'i eklendi ama tarama için `skillspector` komut satırı aracının ayrıca kurulması gerekir: `uv tool install git+https://github.com/NVIDIA/skillspector.git`

## Dikkat edilmesi gerekenler

- **planning-with-files** çağrıldığında kendi hook'larını (UserPromptSubmit, PreToolUse, PostToolUse, Stop, PreCompact) etkinleştirir ve skill klasöründeki yerel betikleri çalıştırır. Betiklerde ağ çağrısı yok.
- **brainstorming** (superpowers) görsel beyin fırtınası için yerel bir web sunucusu başlatabilir.
- Skill açıklamaları her oturumda Claude'un bağlamına yüklenir; 64 skill bağlamda birkaç bin token yer kaplar. Kullanılmayanları silmek bu maliyeti düşürür.

## Kaynak kilidi

Bu dosyadaki ve `skill-kutuphanesi/INDEKS.md` içindeki kısa commit'lerin tam 40 karakterlik SHA karşılıkları makine tarafından okunabilir biçimde `kaynak-kilidi.json` dosyasındadır. Yeniden üretmek için (ağ gerekir):

```
python3 scripts/skill-kaynak-kilidi.py
```
