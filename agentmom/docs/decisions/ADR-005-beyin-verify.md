# ADR-005: Beyin Verify çekirdeği (M10, Faz 4, 2026-10-21)
Karar: doğrulama, üretimden bağımsız bir katmandır. Sağlayıcılar (yerel test koşucusu, tarayıcı) ortak, sürümlü bir sonuç şemasına (`src/verify/schema.ts`, sürüm 1) dönüşür; "geçti" kararını bir model değil, **ham sonuç + kanıt dosyalarından** karar veren bağımsız teslim denetçisi (`auditDelivery`) verir.

**Ortak şema:** koşu (kimlik, sağlayıcı, süreler, durum), test (sonuç, kriter kimlikleri, sınıflandırma, kanıt referansı, deneme sayısı), kanıt (tür, özet, dosya yolu, SHA-256, bayt), ortam; sağlayıcıya özgü ham veri `providerData` ve kanıt dosyalarında korunur. Başarısız her test sınıflandırılır: `product_defect | environment | flaky | infra` (deterministik kurallar; açıklanamayan başarısızlık ürün hatası sayılır: güvenli yönde).

**Sağlayıcılar:** (1) yerel test koşucusu: `node --test` JUnit çıktısı yapılandırılmış sonuca çevrilir, zaman aşımı ve iptal vardır, başarısız dosyalar bir kez yeniden denenir (başarısız→geçti = `flaky`, asla temiz geçiş değil). Ajanın yazdığı test kodu çalıştığı için Node izin modeli kullanılır: yalnız çalışma alanını okur, yalnız ayrı bir geçici dizine yazar, süreç başlatamaz. Bu bir **derinlemesine savunmadır, sert bir sandbox değildir**: ağ kısıtlanmaz. (2) tarayıcı: kurulu Edge, ayrı süreçte `playwright-core` ile; bildirimsel senaryo (kod değil), yalnız yerel 127.0.0.1 sunucusuna istek geçer, dış istekler engellenir ve kaydedilir, ekran görüntüleri D:'de hash'lenir.

**İzlenebilirlik:** testler kriterleri açıkça iddia eder (`[ac:<id>]` etiketi ya da açık eşleme). Eşlemesi olmayan kriter, tüm koşu yeşil olsa bile `unverified` + zayıf test uyarısıdır; yalnız geçen eşlenmiş testler `verified` yapar. Sözleşmede olmayan kimliğe başvuru da raporlanır.

**Kanıt tamlığı:** şema doğrulanır; toplamlar yeniden sayılır; durum/test tutarlılığı, günlük kanıtı, her başarısız testin kanıtı, her kanıt dosyasının varlığı-boyutu-hash'i yeniden kontrol edilir; beklenen sağlayıcı koşusu var mı bakılır.

**Teslim denetçisi:** `passed` yalnız şu koşulda: her kriter eşlenmiş geçen testlerle doğrulanmış, kanıt sağlam, bağımsız inceleyici onaylamış. `failed`: kanıtlı ürün hatası ya da inceleyici reddi. `unverified`: yanlış olduğu kanıtlanmadı ama doğru olduğu da kanıtlanmadı (zayıf eşleme, flaky, ortam/altyapı sorunu, eksik/bozulmuş kanıt).

**Tek onarım koordinatörü:** `RepairCoordinator` yalnız şunu karar verir: `failed` teslimatta ilk ürün hatasını iş akışının implement adımına geri göndermek (en çok 2 tur, sert üst sınır 3). `unverified` ve ortam/altyapı/flaky sorunlar asla "onarılmaz". Motor tek bir koordinatör kabul eder. Onarımda implement, review ve verify yeniden çalışır; plan tekrarlanmaz; çalışma alanı değişiklikleri korunur; geri bildirim, devir sözleşmesinin sınırlandırılmış veri bloğuna konur (güvenilmeyen veri).

**Yetki:** proje testlerini çalıştırmak kabuk düzeyinde yürütmedir: sözleşmede `shell.exec` (ve gerekiyorsa kullanıcı onayı) yoksa doğrulama başlamaz (`verification_not_authorized`). Doğrulama planı yalnız kullanıcı belirteciyle sözleşmeye konabilir.

**Docker:** bilinçli olarak ertelendi (Yusuf, 2026-10-21). Yalıtım yalnız git worktree + yerel süreç + Node izin modeli ile yapılır; Docker tabanlı sandbox/test yoktur.

Sınırlar: izin modeli ağı kısıtlamaz ve zararlı koda karşı tam sandbox değildir; yalnız Node test koşucusu var (başka dil/çerçeve yok); tarayıcı kapsamı küçük bildirimsel senaryolar; TestSprite gibi dış hizmet yok (veri dışarı gitmez).
