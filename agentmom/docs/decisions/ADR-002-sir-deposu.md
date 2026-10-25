# ADR-002: Sır deposu (Faz 1'de yalnız arayüz; Credential Manager SONRA)
Durum: öneri. Faz 1'de `SecretStore` arayüzü ve bellek içi uygulama var; Windows Credential Manager uygulaması bilerek YOK.
Karar: sırlar yalnız `secret:<ad>` referansı olarak dolaşır (veritabanı, günlük, API); değer yalnız `SecretStore` içinde. Kalıcı uygulama Windows Credential Manager olacak.
Bu cihazın durumu: `cmdkey.exe` mevcut; `CredentialManager` PowerShell modülü ve Node tarafında yerel paket yok. Seçenekler: (a) PowerShell P/Invoke (`CredWrite` / `CredRead`) ile ince köprü, (b) yerel Node eklentisi (derleme gerekir), (c) `cmdkey` (okuma desteklemez, yetersiz).
Sonuç: Faz 2 başında (a) denenecek ve ayrı test edilecek; o zamana dek sır gerektiren her entegrasyon ortam değişkeni yerine bellek içi depoyla ve yalnız oturum süresince çalışır. Kalıcı sır yok.

## Güncelleme (2026-10-21, Faz 2) — uygulandı
Yusuf izin verdi. `CredentialManagerStore` (`src/core/secrets/credman.ts` + `credman.ps1`) seçenek (a) ile yazıldı: PowerShell P/Invoke (`CredRead`/`CredWrite`/`CredDelete`/`CredEnumerate`), yalnız `agentmom:` önekli hedefler (hem TypeScript hem betik reddeder; betik başka hedefte çıkış 3 verir), değer komut satırında değil stdin/stdout'ta base64, hata iletilerinde çıktı yok, değer sınırı 2560 bayt. Gerçek Credential Manager ile 6 test geçti; testler yalnız kendi `agentmom:test-*` girdisini yazar ve siler. Sınırlar: her işlem yeni bir PowerShell süreci (yaklaşık 1 sn); bu yöntem yalnız bu cihazda ve kullanıcı oturumunda çalışır.
