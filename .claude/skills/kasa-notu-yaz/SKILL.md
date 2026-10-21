---
name: kasa-notu-yaz
description: Yapılan bir iş, kurulum, taşıma ya da karar için Obsidian kasasına (D:\YusufII\HAFIZAM1\kasa) kurallara uygun not hazırlarken kullan. Kasadan okumada da bu okuma düzenini izle.
---

# Kasa notu yazma ve okuma

Kaynak kurallar: `docs/kurallar/hafiza-ve-not.md`, `docs/kurallar/orkestrasyon-ve-kayit.md`. Bu skill kuralları değiştirmez, adımlara döker. [İP:Talimat düzeni#zkd4TM]

## Yazmadan önce
- Kasada `NOT-KURALLARI.md` ve `NOT-DİZİNİ.md` dosyalarının yalnızca özet ve başlıklarını oku. Hafızanın tamamını okuma; okuma işini en ucuz model (claude-haiku-5-5) yapsın.
- Kasa cihazdadır. Bulut oturumundaysan notu `/mnt/project-files/kasa-notlari/` altına taslak yaz ve kullanıcıya cihaza eklenmesini öner (dosyaya yazma yetkin yoksa söyle).
- `Benim Notlarım` klasörüne yazma. `anahtarlar` klasörüne hiç dokunma.

## Not şablonu (Türkçe, başlıklı, madde madde)
1. **Özet**: notun en başında, 1-3 cümle. Sahibi ve dosyanın ne olduğu.
2. **Ne yapıldı**: değişiklik, kurulum ve taşımalar; nerede ve nasıl geri alınır.
3. **Birlikte çalışılanlar**: kullanılan alt ajanlar (rolü ve modeli), bilgi alınan diğer iş parçacıklarının etiketleri.
4. **Token**: girdi ve çıktı ayrı; alt ajanlar ayrı ve toplam. Kesin değilse "tahmini".
5. **Kullanılan yapay zeka araçları**: ana model, alt ajan modelleri, Jev, Codex/ChatGPT, Gemini.
6. Etiket: `[İP:<iş parçacığı başlığı>#<cse_ kimliğinin son 6 karakteri>]`; Codex ve Antigravity kendi sabit etiketini koyar.

## Yasaklar
- API anahtarı, şifre ve gizli bilgi yazma.
- Kasadan silme yok, üzerine yazıp içerik kaybettirme yok: yalnızca ekleme. Düzeltme de ekleme yoluyla yapılır.
- Kullanılmayan notları "arşivlerken" dosya taşıma; az kullanılan ağa bağla.
