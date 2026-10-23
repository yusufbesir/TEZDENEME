<!-- Ne: Adım Adım Windows kurulum + kaldırma programının üretimi ve davranışı. Sahibi: Yusuf (yusufbesir). Yazan: [İP:Adım Adım Windows sürümü#cihaz] Claude. Değiştirme kuralı: .claude/rules/windows-uygulama-dagitimi.md; kural silinmez. -->
# Kurulum paketi (Windows)

**Özet:** `tool/kurulum/derle.ps1`, `flutter build windows --release` çıktısını NSIS (makensis 3.0.4.1) ile tek bir kurulum exe'sine paketler; kaldırma programı (`kaldir.exe`) kurulumla birlikte gelir ve Windows "Uygulamalar" listesinde görünür.

## Üretim
```
cd adim-adim
flutter build windows --release
powershell -File tool/kurulum/derle.ps1 [-Imza <parmak izi>] -Kaynak build/windows/x64/runner/Release -Surum 1.0.0.1 -Cikti D:\...\Adim-Adim-Kurulum-1.0.0.1.exe
```
`makensis.exe` yolu `-Makensis` ile verilir (varsayılan: electron-builder önbelleği, `%LOCALAPPDATA%\electron-builder\Cache\nsis-3.0.4.1\...`). Üretim artıkları `tool/kurulum/uretilen/` (git dışı).

## Düzen
- Program: `%LOCALAPPDATA%\Programs\Adim-Adim` (yönetici gerekmez); kısayollar: Başlat menüsü; kayıt: `HKCU\...\Uninstall\AdimAdim`.
- Kullanıcı verisi: `%APPDATA%\tr.adimadim\adim_adim`. Kaldırmada yalnız kullanıcı onaylarsa silinir (varsayılan Hayır; sessiz kipte hiç silinmez).

## Silme güvenliği (kural: .claude/rules/windows-uygulama-dagitimi.md)
- Kaldırıcı yalnız `surum-dosyalar.txt` listesindeki dosyaları siler. Listenin SHA-256'sı derleme sırasında kaldırıcıya gömülür; uyuşmazsa hiçbir şey silinmez ve neden `kaldir-hata.log` dosyasına yazılır.
- `RMDir /r` yok; klasörler yalnız boşsa kalkar. Yol `..`, mutlak yol, ayırıcı hatası gibi durumlarda atlanır; bağ/junction (reparse point) olan yola dokunulmaz; `$INSTDIR` sürücü kökü ya da bağ ise durur.
- Güncelleme: yeni sürüm üstüne kurulur; eski listede olup yeni listede olmayan dosyalar (yol ve bağ denetiminden geçerse) kaldırılır. Kullanıcının koyduğu dosyalara dokunulmaz.

## Bilinen sınırlar
- Kod imzası kendi kendine imzalıdır (`-Imza <parmak izi>` ya da `ADIM_IMZA_PARMAK_IZI`; sertifika `Cert:\CurrentUser\My` içinde, anahtar dışa aktarılamaz, betikte şifre/anahtar dosyası yok). Güvenilen kök sertifikalara eklenmedi, bu yüzden SmartScreen yine uyarabilir; kullanıcı ek olarak güvenirse uyarı kalkar. Gerçek (CA) sertifikası alınırsa aynı parametre onun parmak izini alır. `adim_adim.exe` ve kurulum programı imzalanır; `kaldir.exe` imzasızdır.
- Uygulamalar listesinden kaldırınca NSIS, silme için kendini `%TEMP%` altına kopyalar (standart NSIS davranışı; kalıcı değildir).
- Derleme 2026-10-21'de `1.0.0.1` olarak denendi: sessiz kurulum, açıp kapatma, güncelleme (artık dosya ayıklama), sessiz kaldırma geçti; etkileşimli "veri silinsin mi" sorusu elle denenmedi.
