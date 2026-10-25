<!-- Sahip: Claude [İP:AgentMom Faz 11]. Test sonucu kaydı; yalnız ekleme. -->
# Faz 11 · Dilim 1: masaüstü kabuğu (2026-10-22)

## Ne yapıldı
- **REA taraması** (salt okunur, kod/görsel/metin kopyalanmadı): Claude masaüstü (Electron, `app.asar`, sıkı sigortalar, yardımcı servisler), Codex masaüstü (Chromium kabuğu + `codex.exe` + komut çalıştırıcı + Windows sandbox), eski `yz-merkezi` kopyası. **Antigravity ve Cursor bu cihazda kurulu değil** (taranamadı, uydurulmadı). Bulgular AgentMom REA akışına yerel kaynak + 6 bulgu olarak kaydedildi (`scripts/rea-kayit-masaustu.mjs`; model çağrısı 0).
- **Eğitim belgesi**: `docs/egitim/masaustu-ajan-uygulamalari.md` (şemalarla; her bilgi Gözlem / Genel bilgi / AgentMom etiketli).
- **Kabuk**: Edge uygulama kipi, AgentMom'a özel D: profili, özgün simge (`scripts/make-icon.mjs`), tek-örnek kilidi, sunucuyu gizli başlatma, pencere kapanınca düzgün kapanış (`/api/desktop/quit`), belirteçsiz pencere açılışı (tek kullanımlık bilet: `/api/desktop/ticket` → `/desktop/enter`).
- Kurulum: `D:\Programlar\AgentMom\` (AgentMom.vbs, simge, kısayol betiği, BENIOKU). Kod `D:\YusufII\Projeler\agentmom`'da kalır.

## Gerçek denemeler (hepsi bu cihazda çalıştırıldı)
| Deneme | Sonuç |
|---|---|
| `node src/desktop/launcher.ts` | sunucu açıldı, kilit yazıldı, pencere açıldı, panel gerçek veriyle "Sağlıklı" |
| Pencere kapatılınca | sunucu durdu (8787 kapalı), kilit boşaldı, başlatıcı çıktı |
| `wscript AgentMom.vbs` (kurulu yoldan) | aynı akış; konsol penceresi açılmadı |
| Aynı anda ikinci başlatma | ikinci sunucu başlamadı (1 başlatıcı, 1 sunucu) |
| Ekran görüntüleri | `kabuk-masaustu.png` (1584×992), `kabuk-dar.png` (634×1017): yalnız AgentMom penceresi |

Not: ilk iki ekran görüntüsü tam ekrandı ve başka bir uygulamanın içeriğini yakalamıştı; depoya girmeden Geri Dönüşüm Kutusu'na taşındı, yerine `scripts/capture-window.ps1` (yalnız pencere çerçevesini yakalar) yazıldı.

## Testler
- `npx tsc --noEmit` temiz. `npm test`: **369 test, 369 geçti** (önceki 359 + bilet 2, kabuk 5, uç 3 yeni test).
- Yeni testler: bilet tek kullanımlık/30 sn/geçersiz girdiler, `/api/desktop/ticket` ve `/quit` yalnız kullanıcı belirteci, yönlendirme `/#token=…` + `no-store`, başlatıcı komut satırında belirteç yok ve geçersiz bilet/port reddi, kilit ayrıştırma, profil/kilit/günlük `D:` altında.
- Bilinen: arayüz tarayıcı testi ağır yükte bir kez zaman aşımına uğradı, tek başına geçti (kararsızlık yük kaynaklı).

## Sınır / sonraki
- Kurulum/kaldırma programı, güncelleme satırı, masaüstü kısayolu (Yusuf isterse `kisayol-olustur.ps1 -Masaustu`) ve yeni 3 sütunlu arayüz + Ayarlar/Yardım dilim 2'dedir.
- Kalıcı silmeyi koda bağlama işi Yusuf'un kararıyla **iptal edildi**; çalışma `beklemede/faz11-silme-yasagi` dalında saklı, ana dala alınmadı.

## Bağımsız güvenlik denetimi (Opus, salt okunur) — Geçti, 0 yüksek
Bulgular ve işlem: (1) sunucuyu yalnız başlatıcının kendi başlattığı durumda kapat → düzeltildi; (2) atomik kilit (`wx`) → düzeltildi; (3) yalnız yapılandırılmış porta bağlan, kilitteki port farklıysa kullanma → düzeltildi; (4) `/desktop/enter` için `Sec-Fetch-Site` denetimi + test → düzeltildi; (6) VBS'te yalnız mutlak Node yolu → düzeltildi; (7) hata günlüğü depo dışı durum klasörüne → düzeltildi; (8) kısayol betiği var olan kısayolun üzerine yazmaz → düzeltildi. (5) Edge profil geçmişinde `/#token=…` kalma olasılığı: belirteç her sunucu açılışında yenilendiği ve profil `D:` altında AgentMom'a özel olduğu için düşük risk olarak kabul edildi; ACL değişikliği yapılmadı (kural). gitleaks: 0 sızıntı; semgrep: 1 yanlış pozitif. Son test: 370/370.
