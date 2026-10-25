<!-- Sahip: Claude [İP:AgentMom Faz 11]. Karar kaydı; değişiklik yalnız ekleme. Silme kararı yalnız Yusuf'undur. -->
# ADR-015: Geçici yetenek izinleri, veri sınırı, değişiklik defteri, olay otomasyonu (D5b)
Durum: kabul (2026-10-23). Politika motoru deterministik kalır; model/ağ yok; hiçbir yeni parça izin verme yetkisi kazanmaz.

## 1. Geçici yetenek izinleri (madde 77)
- Kullanıcı, **eylem + klasör** kapsamlı, **en çok 24 saat**, **1-100 kullanım** sayılı izin verir. İzin verilebilen eylemler: `file.read`, `file.write`, `verification.run` (kabuk, ağ, sağlayıcı çağrısı, izin değişikliği verilemez).
- İzin yalnız motorun `approval_required` kararını (başka hiçbir kuralı değil) `allow`a çevirir. Yasak klasör, kapsam dışı yol, sözleşmede olmayan eylem, bütçe, ücretli rota, güvenilmeyen depo ve süresi dolmuş sözleşme **önce** değerlendirilir ve aynen reddedilir.
- Kapsam, sözleşmenin izinli klasörlerinin içinde olmalı ve yasak klasöre değmemeli. İzni yalnız kullanıcı verir ve iptal eder; kullanım atomik tüketilir (koşullu UPDATE). Kayıt yalnız eklenir: içerik değişmez, `uses` yalnız artar, iptal kesindir, satır silinemez (SQL tetikleyiciler). Oluşturma/kullanım/iptal denetlenir.
- Uygulandığı yer: görev oluşturma kapısı (`POST /api/tasks`). Otomasyonun açtığı görevler izin **tüketemez**.

## 2. Veri sınırı (madde 76)
- Sınıflar: public, internal, sensitive, secret. `secret` yalnız yerel rotada kalır (ağ isteği ve yerel olmayan sağlayıcı reddedilir); `sensitive` ücretli (API) rotaya gitmez. Bu bir ret kuralıdır: kullanıcı onayı ya da geçici izin gevşetemez. Sınıf verilmezse kural uygulanmaz.
- Sınıflandırma **sezgiseldir** (yasak klasör, `sensitiveDirs`, sır dosya adı, sır kalıbı); dosya içeriği taranmaz. `sensitiveDirs` sözleşmeye eklenir, katmanlar çıkaramaz. Sağlayıcı çağrısında depo/çalışma ağacı yolları sınıflandırılır.

## 3. Anlamsal değişiklik defteri (madde 78)
- Yalnız eklenir; sır taranır ve kısaltılır. Görev onay/ret, görev sözleşmesi, geçici izin ve otomasyon kural değişiklikleri otomatik; kullanıcı elle not ekleyebilir. Denetim zincirinin yerine geçmez, "ne değişti ve neden"i insan okunur tutar.

## 4. Olay tetiklemeli otomasyon (madde 13)
- Kuralları yalnız kullanıcı oluşturur. İki güvenli eylem: **bildir** ve **görev kaydı aç** (normal politika yolundan geçer; onay gerekiyorsa onay bekler). Otomasyonun kendi olayları kural tetiklemez (döngü koruması), kural başına bekleme süresi (10 sn-24 sa) ve saatlik 30 çalışma sınırı vardır. İşleme olay yazımından sonra ayrı mikro-görevde yapılır ve hatası denetim yazımını bozmaz.

## Bilinen sınırlar
Tetikleyici yalnız denetim olayları. Veri sınıflandırması içerik taramaz. 014 migrasyonunun geri alınması bu kayıtları siler (önce yedek).

Opus denetimi (2026-10-23) sonrası eklenen sınırlar: görev oluşturma yolu (`POST /api/tasks`) `dataClass` göndermez, bu yüzden veri sınırı bugün yalnız sağlayıcı çalıştırma kapısında (yol + sağlayıcıya giden metin) uygulanır; `network.request` için secret kuralı motorda vardır ama o yoldan tetiklenmez (sınıf verilmeyince kural uygulanmaz, bilinçli açık). Kullanıcı `kind: grant` gibi otomatik türlerle de elle defter kaydı yazabilir (aktör kaydedilir). Windows 8.3 kısa adı çözümlemesi (canon/realpathSync) D5b öncesinden gelen ayrı bir konudur ve ayrıca sınanmalıdır.
