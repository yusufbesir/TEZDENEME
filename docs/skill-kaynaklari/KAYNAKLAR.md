# Projeye eklenen skill'lerin kaynakları

`.claude/skills/` altındaki skill'ler aşağıdaki depolardan 10 Ekim 2026'da kopyalandı. Claude Code bu klasördeki skill'leri proje açıldığında kendiliğinden yükler.

| Depo | Commit | Lisans | Eklenen skill'ler |
|---|---|---|---|
| [obra/superpowers](https://github.com/obra/superpowers) | `bb92a77` | MIT | requesting-code-review, systematic-debugging, verification-before-completion |
| [mattpocock/skills](https://github.com/mattpocock/skills) | `49dd158` | MIT | pr |
| [NVIDIA/SkillSpector](https://github.com/NVIDIA/SkillSpector) | `5edc347` | Apache 2.0 | skill-inspector |

Lisans metinleri `lisanslar/` klasöründe.

2026-10-25: Kullanılmayan 59 skill Yusuf'un onayıyla `skill-kutuphanesi/<sahip__depo>/<ad>/` altına taşındı (`git mv`, silinmedi). Bu tablo yalnız `.claude/skills/` altında etkin kalan kaynaklı skill'leri listeler (kendi yazdığımız jev-karar, kasa-notu-yaz, is-kaydi, denetmen-raporu ve karpathy-guidelines burada yok). Taşınanlar `INDEKS.md` içinde; geri almak için `scripts/skill-etkinlestir.sh <ad>`.

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
- Skill açıklamaları her oturumda Claude'un bağlamına yüklenir; etkin skill'ler bağlamda yer kaplar. Kullanılmayanlar kütüphaneye taşınarak bu maliyet düşürüldü.

## Kaynak kilidi

Bu dosyadaki ve `skill-kutuphanesi/INDEKS.md` içindeki kısa commit'lerin tam 40 karakterlik SHA karşılıkları makine tarafından okunabilir biçimde `kaynak-kilidi.json` dosyasındadır. Yeniden üretmek için (ağ gerekir):

```
python3 scripts/skill-kaynak-kilidi.py
```

Kopyalanan dosyaların bozulmadığını doğrulamak için `icerik-ozeti.sha256` dosyası, `skill-kutuphanesi/` altındaki (kök `INDEKS.md` ve `README.md` hariç) ve bu tabloda listelenen skill klasörlerindeki her izlenen dosyanın SHA-256 özetini standart `sha256sum` biçiminde tutar. Depo kökünden `sha256sum -c --quiet docs/skill-kaynaklari/icerik-ozeti.sha256` ile denetlenir. `kaynak-kilidi.json` içindeki `dosya_sayisi` ve `icerik_ozeti` alanları her kaynağın dosya sayısını ve ilgili manifest satırlarının birleşik özetini verir. Ağ olmadan yeniden üretmek için: `python3 scripts/skill-kaynak-kilidi.py --yalniz-ozet`.
