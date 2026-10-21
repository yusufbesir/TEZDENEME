# Ekim 2026 rehber taraması: uygulanan öneriler

[İP:Claude rehber takibi ve zamanlanmış görevler#V6655S]

Kaynak: 16 Ekim 2026 taraması (`claude-rehber-takibi/2026-10-16-tarama.md`). Yusuf 16 Ekim'de onayladı.
Jev'e erişilemedi (bulut oturumu); öneriler Jev ile puanlanmadı.

## 1. Güvenlik hook'larında `onFailure: "block"` (Claude Code 2.1.295)

Durum: depoda güvenlik hook'u yok. Kalıcı silme ve anahtarlar klasörü korumaları cihazdaki
kullanıcı ayarlarında (`~/.claude/settings.json`) duruyor. Bu yüzden değişiklik cihazda yapılmalı.

Cihazda yapılacak:
- Yalnız silme ve anahtar korumalı komut hook'larının her `hooks` girdisine `"onFailure": "block"` ekle.
- Jev'e giden hook'lara ekleme. Jev zaman aşımı "kanıt yok" değil "degraded" sayılır; engellemek bu kurala aykırı olur.
- Ekledikten sonra hook betiğini geçici olarak bozup (örneğin yanlış yol) korunan bir komutun engellendiğini dene, sonra eski hâline getir.

Örnek biçim (yol ve eşleştirici cihazdaki mevcut değerlerle aynı kalır):

```json
{ "type": "command", "command": "<mevcut koruma betiği>", "onFailure": "block" }
```

## 2. Alt ajanlara efor seviyesi (Claude Code 2.1.292)

Uygulandı: `.claude/agents/` altında scout `low`, implementer `medium`, verifier `high`.
`autoCompactWindow` eklenmedi; ajan tanımındaki tam anahtar adı ve değer biçimi doğrulanamadı.

## 3. AGENTS.md ortak kural dosyası önerisi (Claude Code 2.1.277)

Mevcut dosyalara dokunulmadı; yalnız öneri.

- Claude Code, CLAUDE.md varken AGENTS.md'yi kendiliğinden okumaz. Codex ise AGENTS.md okur.
- Önerilen düzen: üç yapay zekanın ortak kuralları (güvenlik kuralları, Türkçe yanıt, İP etiketi,
  token ve araç kaydı, silme yasağı, anahtarlar klasörü yasağı) kökte `AGENTS.md` dosyasına taşınır.
- CLAUDE.md yalnız Claude'a özgü bölümleri tutar (Orchestrator ve Jev kuralları) ve en başta
  `@AGENTS.md` satırıyla ortak dosyayı içe aktarır.
- Geçiş adımları: AGENTS.md yeni dosya olarak yazılır, ortak kurallar CLAUDE.md'den kaldırılmadan
  önce Yusuf'a gösterilir (mevcut dosyanın üzerine yazma kuralı), sonra Codex ve Claude ile birer
  deneme oturumunda kuralların okunduğu kontrol edilir.

## 4. Boştaki oturumların otomatik sıkıştırılması (Claude Code 2.1.299)

Karar: varsayılan açık kalır, ayar değişikliği yok.

## 5. Otomatik ajan ve token kaydı hook'u (tasarım)

Amaç: `.claude/orchestrator-log.md` satırlarının (tarih, görev, ajan/model, token, sonuç) elle değil
hook ile yazılması.

- Olay: alt ajan bittiğinde çalışan hook. Girdide ajan kimliği ve türü ile döküm dosyası yolu gelir.
- Betik yalnız yereldir: döküm dosyasından model adını ve kullanım alanlarını (girdi, çıktı,
  önbellek okuma ve yazma) okur, toplamı kodla hesaplar, günlüğe bir satır ekler.
- Görev ve sonuç alanları ajan çıktısının ilk satırından alınır; bulunamazsa "elle tamamlanacak" yazılır.
- Hook içinde Jev çağrısı yapılmaz (senkron Jev yasağı). Ağ erişimi yoktur, gizli bilgi okunmaz.
- Hook hata verirse işi engellemez; kayıt eksik kalır ve orchestrator bir sonraki satırda elle tamamlar.
- Cihazda doğrulanacaklar: olay adı, girdideki ajan kimliği alanının adı ve dökümdeki kullanım
  alanlarının tam yolu. Bunlar doğrulanmadan betik yazılmaz.

## Kullanılan yapay zeka araçları ve token

- claude-opus-5-5 (ana oturum). Token: girdi yaklaşık 30 bin, çıktı yaklaşık 3 bin (tahmini).
