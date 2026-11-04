---
description: Faz 11 masaüstü ajan uygulamaları (Antigravity, Cursor, OpenCode) kurulum kaydı
sahip: Claude [IP:AgentMom Faz 11]
tarih: 2026-10-22
kural: Yalnız ekleme; silme yalnız Yusuf kararıyla ve Geri Dönüşüm Kutusu'na taşıyarak.
---

# Kurulum kaydı (2026-10-22)

Genel: indirmeler yalnız üreticinin resmi adresinden, `D:\Programlar\<Ad>\indirilenler\` altına; imza `Get-AuthenticodeSignature` ile, SHA256 `Get-FileHash` ile alındı. Kurulumlar kullanıcı bazlı, sessiz, yükseltme (UAC) istenmedi. Hesap girişi, API anahtarı ve model çağrısı yapılmadı. Kurulum paketleri için üreticinin yayımladığı ayrı hash dosyası yoktur; güven imzaya dayanır (3/3 Valid, yayıncı eşleşti).

| Alan | Antigravity | Cursor | OpenCode |
|---|---|---|---|
| Resmi indirme adresi | https://storage.googleapis.com/antigravity-public/antigravity-hub/2.25.0-6535192714805248/windows-x64/Antigravity-x64.exe (adres antigravity.google/download sayfasından alındı) | https://downloads.cursor.com/production/8fcb8ace5c73fa31f2e2707fd6783160e4ed3e49/win32/x64/user-setup/CursorUserSetup-x64-3.26.16.exe (adres api2.cursor.sh güncelleme API'sinden alındı) | https://github.com/anomalyco/opencode/releases/download/v1.19.3/opencode-desktop-win-x64.exe (resmi GitHub sürüm sayfası; sst/opencode bu depoya yönleniyor) |
| Dosya adı | Antigravity-x64.exe | CursorUserSetup-x64-3.26.16.exe | opencode-desktop-win-x64.exe |
| Boyut (bayt) | 165631944 | 227935608 | 126269464 (GitHub sürüm listesindeki boyutla aynı) |
| SHA256 | 073A4FD54A446DE745C9816E9AE01D9E2115EA832BE1392F1536D765D8C43B73 | 12D19BCB15F56067C41EBC8A148E4B40FE96756FDFA1C2191606AA9E2181A1E9 | EB2554AB5484886DB78FD861008A2A2DB985BFA3DC3720CE7D1CDA027CE99174 |
| Paket imzası | Valid, Google LLC | Valid, Anysphere, Inc. | Valid, Anomaly Innovations, Inc |
| Kurulu ana exe imzası | NotSigned (yalnız kurulum paketi imzalı) | Valid | Valid |
| Kurulum biçimi / bayraklar | NSIS: `/S /currentuser /D=...` | Inno Setup: `/VERYSILENT /NORESTART /SUPPRESSMSGBOXES /DIR=... /MERGETASKS=!runcode,!addtopath` | NSIS: `/S /currentuser /D=...` |
| Kurulum yolu | D:\Programlar\Antigravity | D:\Programlar\Cursor | D:\Programlar\OpenCode |
| Sürüm (kurulu exe) | 2.25.0 | 3.26.16 | 1.19.3 |
| C: üzerindeki durum klasörleri | %LOCALAPPDATA%\antigravity-updater | %APPDATA%\Cursor | %APPDATA%\ai.opencode.desktop ve %LOCALAPPDATA%\@opencode-aidesktop-updater |
| İlk açılış | Google giriş duvarı (giriş yapılmadı) | Log In / Sign Up duvarı (giriş yapılmadı) | Giriş istemeden oturum ekranı (mesaj gönderilmedi) |
| Pencere görüntüsü | tarama\antigravity-pencere.png | tarama\cursor-pencere.png | tarama\opencode-pencere.png |
| Sonuç | KURULDU, tarandı (giriş öncesi ekran + yapı) | KURULDU, tarandı (giriş öncesi ekran + yapı) | KURULDU, tarandı (ekran + yapı) |

Notlar
- Antigravity için indirme sayfasında ayrıca "Antigravity IDE" (2.5.5, tek başına) ve komut satırı sürümü (1.4.4, `irm ... | iex` ile kurulan betik) listeleniyor; bunlar kurulmadı (betikle uzaktan çalıştırma kural dışı; IDE istenirse ayrıca karar).
- OpenCode için komut satırı zip'i (opencode-windows-x64.zip) de var; masaüstü uygulaması kurulduğu için indirilmedi.
- Kurulan üç uygulama başlatıldı, yalnız kendi başlattığım süreçler `CloseMainWindow` ile kapatıldı; kalan süreç yok.
- Üçünün Electron fuse durumu aynı (RunAsNode açık, NodeOptions açık, asar bütünlüğü kapalı); ayrıntı `docs/egitim/masaustu-ajan-uygulamalari.md` bölüm 11.
- Kaldırıcılar kurulum klasörlerinde (`Uninstall ...exe`, `unins000.exe`); kaldırma yalnız Yusuf'un kararıyla.
