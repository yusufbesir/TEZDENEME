---
paths:
  - "adim-adim/lib/ekranlar/**"
  - "adim-adim/lib/bilesenler/**"
---

> **Özet:** Sonuç bekleyen arayüz işlemlerinde gerçek adımları gösteren emek illüzyonu tasarımı kuralı. Yalnızca arayüz dosyaları açılınca yüklenir. Sahibi: Yusuf. Kaynak: `docs/kurallar/orkestrasyon-ve-kayit.md` içinden taşındı, içerik değişmedi. Kural silinmez. [İP:Talimat düzeni#zkd4TM]

## Emek illüzyonu tasarımı (kullanıcının kuralı, 2026-10-16)
Uygulama arayüzü tasarlarken, gerektiği projelerde (arama, hesaplama, dönüştürme, analiz, oluşturma gibi kullanıcının bir sonuç beklediği işlemlerde) emek illüzyonu (labor illusion / operasyonel şeffaflık) tasarımı kullanılır: uygulama arka planda yaptığı işi adım adım görünür kılar (ör. "Dosyalar okunuyor", "Barkodlar doğrulanıyor", "Sonuçlar karşılaştırılıyor"), böylece arayüz daha inandırıcı ve güven verici olur. Gösterilen adımlar uygulamanın gerçekten yaptığı işleri anlatır; uydurma adım gösterilmez. Gereksiz yapay bekleme eklenmez; çok hızlı işlemlerde adımlar kısa bir animasyonla gösterilebilir ama kullanıcıyı belirgin biçimde yavaşlatmaz. Basit, anlık işlemlerde (ayar değiştirme, menü açma) kullanılmaz.
