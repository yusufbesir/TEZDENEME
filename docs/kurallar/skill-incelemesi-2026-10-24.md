# Skill ve araç güvenlik incelemesi (2026-10-24)

> **Özet:** 7 dış skill/araç deposunun güvenlik incelemesi ve kurulum kararları. Yöntem: depolar yalnız okundu (shallow klon, kod çalıştırılmadı). Lisans, hook/betik, ağ çağrısı ve prompt enjeksiyonu kalıpları tarandı. Bu bir statik tarama; tüm kodun satır satır denetimi değildir. [İP:Dürüstlük kuralı ve yeni skill'leri ekle#P1czsj]

| Depo | Lisans | Yıldız | Son commit | Bulgu | Karar |
|---|---|---|---|---|---|
| JuliusBrussee/caveman | Apache-2.0 (+MIT dosyası) | ~115k (sayfadan) | 2026-10-24 | Yalnız-skill kurulumu var (`skills/caveman`). Kurucu betikler `npx`/`curl\|bash` ve Claude ayarlarına hook yazıyor; hook kodunda ağ çağrısı görmedim | Yalnız `skills/caveman` SKILL.md kopyalanır; kurucu/hook kullanılmaz |
| blader/humanizer | MIT | doğrulanamadı | 2026-10-16 | Tek SKILL.md, betik yalnız paket doğrulama; enjeksiyon kalıbı yok | Kurulur |
| nateherkai/scroll-craft | MIT | doğrulanamadı | 2026-09-30 | Skill + `shoot.mjs/encode.sh/doctor.mjs`; yerel çalışır, Playwright ve ffmpeg ister, ağ çağrısı yok | Kurulur (betikler yalnız D:\Programlar altında çalıştırılır) |
| addyosmani/agent-skills | MIT | doğrulanamadı | 2026-10-13 | `skills/` içi yalnız metin. `hooks/sdd-cache-*.sh` curl ile URL'lere HEAD isteği atıyor (ağ, hook) | Yalnız `skills/` kopyalanır; hooks kurulmaz |
| heygen-com/hyperframes | Apache-2.0 | doğrulanamadı | 2026-10-24 | 337 MB, yüzlerce betik; ses/TTS tarafı Gemini kimlik doğrulaması ve dış servis kullanıyor (remote) | Şimdi kurulmaz; video işi gelince ihtiyaç anında, API anahtarı kararı Yusuf'ta |
| apify/apify-mcp-server | MIT | doğrulanamadı | 2026-10-24 | Apify API anahtarı ister; veri dış sunucuya gider (remote), anahtar `anahtarlar` kuralına tabi | Kurulmaz; Yusuf anahtar verirse ayrıca |
| sindresorhus/awesome | CC0 | doğrulanamadı | - | Skill değil, bağlantı listesi | Kurulmaz; kaynak olarak okunur |

Not: "doğrulanamadı" = bu oturumda GitHub API'sine erişim olmadığı için yıldız sayısı okunamadı; uydurulmadı.
