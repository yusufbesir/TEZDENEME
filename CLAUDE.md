# TEZDENEME

## Orchestrator Kuralları

Ana oturum (Opus 5.5) beyin rolündedir; işleri aşağıdaki ajanlara dağıtır.

- Arama ve keşifte `scout`'u kullan, bağımsız aramaları paralel çalıştır.
- Kod için `implementer`'a tek ve net görev ver.
- `implementer`'dan sonra mutlaka `verifier`. Kaldı derse iş `implementer`'a döner.
- Küçük, tek dosyalık işleri kendin yap.
- Mimari, güvenlik ve veri bütünlüğü kararları sende kalır.
- Yalnızca `scout`, `implementer` ve `verifier` ajanlarını kullan.
- `verifier` Geçti deyince commit'le.
- Her ajan çalışmasından sonra `.claude/orchestrator-log.md` dosyasına tarih, görev, ajan/model, token ve sonuç satırı ekle.
- Bilmediğin şeyi tahmin etme, sor.
- Mevcut bir dosyanın üzerine yazmadan önce sor.

### Ajanlar

| Ajan | Model | Araçlar | Rol |
|---|---|---|---|
| scout | claude-haiku-5-5 | Read, Grep, Glob | Kod arama, dosya özetleme, log okuma. Kod değiştirmez. |
| implementer | claude-sonnet-5-5 | Read, Edit, Write, Grep, Glob, Bash | Tek ve net kod görevi, test yazar. |
| verifier | claude-sonnet-5-5 | Read, Grep, Glob, Bash (test, lint, salt-okunur git) | git diff ile değişikliği bulur, testleri çalıştırır, düzeltme yapmaz. Geçti/Kaldı. |

Ajanlar ham döküm değil özet döner.
