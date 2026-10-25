<!-- Sahip: Claude [İP:AgentMom Faz 11]. Karar kaydı; değişiklik yalnız ekleme. -->
# ADR-013: Kullanım-tabanlı, denetimli otomatik yedek (Faz 11, dilim 4)
Durum: kabul (2026-10-22). Kaynak: Yusuf'un kararı ("zamanlayıcı evet ama günlük değil; yedek zamanı o günkü kullanıma göre belirlensin ve bunu denetleyen bir yapı kurulsun; kısayol yok").

## Karar
- **Tetikleme uygulama içindedir** (`src/ops/backup-scheduler.ts`, sunucu süreci içinde): Windows Görev Zamanlayıcı, yönetici izni ya da ek süreç GEREKMEZ. Sabit saat yoktur.
- **Kural:** son yedekten beri anlamlı değişiklik (denetim olayları: görev, onay, hafıza, karar, alt oturum, iş akışı; yedek/akış gürültüsü/salt okuma sayılmaz) en az eşik kadarsa (varsayılan 8; hiç yedek yoksa 1) VE kullanım sakinleştiyse (varsayılan 10 dk) yedek alınır; uygulama kapanırken değişiklik varsa eşik/sakinlik aranmadan son bir yedek alınır; **hiç değişiklik yoksa yedek alınmaz.**
- **Yürütücü mevcut `createBackup`/`verifyBackup`'tır:** anahtar/belirteç dışarıda, her yedek YENİ klasör (üzerine yazma yok), hiçbir şey silinmez; her yedek hemen doğrulanır; en son yedek 12 saatte bir yeniden doğrulanır.
- **Denetim:** her karar `backup.decision` olarak denetim kaydına yazılır (alındı/atlandı + sebep; aynı atlama sebebi günde en çok bir kez); `backup.verify`, `backup.failed`, `backup.scheduler_error` ayrı olaylardır.
- **Görünür uyarılar** (`GET /api/backup/status`, panel Genel bakış + uyarı şeridi, Ayarlar › Yedekleme): yedek başarısız, doğrulama başarısız, "yedek eski ama değişiklik var" (3 gün), zamanlayıcı hatası. Çökme sessiz kalmaz (tur hata fırlatmaz, hata uyarıya ve denetim kaydına düşer).
- **Sınırlar:** modül politika/ACL/dosya silme çağrısı içeremez (kaynak taraması testi); tek örnek (aynı anda tek yedek); elle yedek `POST /api/backup/run` yalnız kullanıcı belirteci ve onay penceresiyle.
- **Bilinen sınırlar:** denetim olayı sayısı "değişiklik" için vekil ölçüdür (dosya içeriği hash'i değil); sunucu hiç çalışmıyorsa yedek de alınmaz (bilinçli: kullanım yok); eski yedekleri temizleme kararı yine Yusuf'undur (Geri Dönüşüm Kutusu).
