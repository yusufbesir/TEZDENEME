# TAARKOD yeni özellik önerileri (2026-10-16)
Bu dosya: Yusuf'un "bu tarz program için başka ne eklenebilir" sorusunun yanıtı. Web araması yalnız başlık verdi (içerik okunamadı); öneriler genel barkod/etiket yazılımı bilgisine dayanır, kaynak atfı yok. Yapılmadı, Yusuf seçecek.

Öncelik sırası (değer / iş):
1. A4 etiket sayfası yazdırma (sayfada 3x8 gibi ızgara, kenar boşluğu ayarı, PDF olarak kaydet). Barkodu basmadan işe yaramaz; en çok istenen.
2. Excel/CSV'den toplu içe aktarma: kolondaki seri numaralarını okuyup barkod üretir ya da çözer.
3. Barkod yazıcısı boyutları için etiket şablonları (örn. 40x25, 50x30, 100x50 mm) ve ZPL/TSPL dışa aktarma (ZPL zaten var).
4. Geçmiş: son üretilen aralıklar ve seri adları yerel dosyada; "bu numarayı ben mi ürettim?" denetimi.
5. Doğrulama modu: bir liste yapıştır, hangileri geçersiz/yinelenen/kapasite dışı raporla.
6. Kamera/okuyucu ile okuma: kamerayla barkodu okutup doğrudan Çöz'e gönder (tarayıcı BarcodeDetector API; Windows Electron'da denenmeli).
7. Şifreli kural yedeği: kural dosyasını parolayla şifreleyip kaydetme (anahtar kelime dosyaya yazılmaz kuralı korunur).
8. Başka simgeler: Data Matrix, QR, EAN-13 (EAN yalnız sayısal ve GS1 kayıtlı kod gerektirir; iç kullanımda Code 128 yeterli).
9. Çoklu dil (EN/TR), otomatik güncelleme denetimi, kod imzalama (SmartScreen uyarısını azaltır; ücretli).
