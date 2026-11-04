# Codex okuma kapsamı: araştırma ve karar (2026-10-21)
Soru: Codex'in "salt-okunur" kipi okumayı çalışma dizinine kısıtlıyor mu; kısıtlamıyorsa ACL kullanmadan bir seçenek var mı?

## Yöntem (model çağrısı yok, giriş kullanılmadı)
1. `codex --help`, `codex exec --help`, `codex sandbox --help`, `codex features list` okundu.
2. Yürütülebilir dosyadaki yapılandırma dizeleri tarandı (yalnız yapı: alan adları, hata iletileri).
3. `codex sandbox -- cmd /c type <dosya>` ile (Windows kısıtlı belirteç sandbox'ı; model çağrısı ve giriş yok) çalışma dizini içi ve dışı iki zararsız deneme dosyası okutuldu (`D:\Programlar\npm-tmp\probe`).

## Bulgular
| Deney | Sonuç |
|---|---|
| Varsayılan | Çalışma dizini içi **ve dışı** dosya okunabildi |
| `-c sandbox_mode="read-only"` | Aynı: dış dosya **okunabildi** |
| `default_permissions` + `permissions.<ad>.filesystem` profili (yalnız çalışma alanı okuma) | Şema geçerli (`FilesystemPermissionsToml`, `PermissionProfileToml`, `:minimal`, `:workspace_roots`, `:root`, `:tmpdir` özel yolları vardır) ama bu cihazda **çalışmadı**: `elevated Windows sandbox requires effective :root read access` |
| Aynı profil + `windows.sandbox="unelevated"` | `Restricted read-only access requires the elevated Windows sandbox backend` |

Sonuç: Codex'in okuma kısıtı bu Windows kurulumunda yalnız **"elevated" sandbox arka ucu** ile mümkün. O arka uç (`codex-windows-sandbox-setup.exe`) makine genelinde sandbox hesapları ve ağ kuralları kurar; bu bir sistem değişikliğidir, Yusuf onayı gerektirir ve yapılmadı. ACL kullanmadan ya da sistem değiştirmeden okuma kısıtı **sağlanamıyor**.

## Karar (uygulandı)
Politika kuralı: sağlayıcı `readScope: "unconfined"` bildirirse (Codex bildirir), `provider.call` yalnız hedef depo `contract.trustedRepos` içindeyse izin alır; aksi halde `untrusted_repo_for_unconfined_provider` ile reddedilir. Varsayılan `trustedRepos` boştur (hiçbir depoya güvenilmez); proje/yerel yapılandırma katmanları listeyi genişletemez, yalnız kullanıcı katmanı (`AGENTMOM_USER_CONFIG`) genişletebilir. Güvenilen olmayan depoda Codex hiç başlamaz; Claude Code gibi çalışma dizinine bağlı sağlayıcılar etkilenmez. Testler: politika motoru (7 senaryo), yapılandırma daraltma, sunucu uçtan uca.

## Kalan risk
Güvenilen bir depoda bile Codex dosya sistemini okuyabilir (oturum belirteci ağacı, audit veritabanı, depo dışı dosyalar). "Güvenilen" işareti yalnız kullanıcı kararıyla konur; istem enjeksiyonu içeren bir güvenilen depo içeriği hâlâ risk taşır.

## Yusuf'un seçebileceği kalıcı çözümler (hiçbiri uygulanmadı)
1. Codex'in elevated Windows sandbox'ını kurmak (makine genelinde hesap ve ağ kuralı; yönetici onayı) ve `:root` salt-okunur yerine dar bir okuma profili tanımlamak.
2. NTFS ACL ile belirteç / kasa dizinlerini ajan sürecinin hesabından ayırmak (ayrı kullanıcı hesabı gerektirir).
3. Codex'i yalnız bir VM / kapsayıcı içinde çalıştırmak.

## Yusuf kararları (2026-10-21, 17:04–17:07) ve uygulama
1. **17:04:** sistem genelinde elevated sandbox KURMA, ACL yok; kalıcı çözüm olarak `trustedRepos` + elevated sandbox "Faz 5+ adayı".
2. **17:06:** "Codex, Claude ve Gemini aynı yetkide olsun": Codex'e özel ek kısıt (kayıt dışı yollarda reddi) üç sağlayıcı için ortak güvenilen kök kuralına bağlandı. Uygulama (kural altyapısı korunarak): kullanıcı yapılandırması `D:\YusufII\Projeler\agentmom-config\user-config.json` (depo ve ajanların çalıştığı `agentmom-state` ağacı dışında; yalnız kullanıcı katmanı genişletebilir; sunucu bu dosyayı o ağaçların içinde bulursa başlamayı reddeder) `trustedRepos` ve `allowedDirs` olarak `D:/YusufII/Projeler`'i tanımlar; yeni `forbiddenDirs` alanıyla **`D:/Arşiv` üç sağlayıcı için ve her eylem için HEDEF olarak kapalı** (`path_forbidden`; hedef yasak dizinin içindeyse ya da onu İÇERİYORSA (ör. sürücü kökü) reddedilir; bağ/junction üzerinden gelen yol gerçek konumuyla değerlendirilir; diğer tüm izin kurallarından önce; katmanlar ekleyebilir, çıkaramaz). Bu bir yetki kapısıdır, **okuma engeli değildir**: Codex salt-okunur kipte dosya sistemini okuyabildiği için `D:/Arşiv` içeriğinin OKUNMASI Codex'te teknik olarak engellenemez (yalnız elevated sandbox çözer; ertelendi). Kanıt (gerçek yapılandırma + motor): üç sağlayıcı da `D:/YusufII/Projeler/...` içinde `within_contract`; `D:/Arşiv/...` hepsinde `path_forbidden`; `D:/Baska/repo` Codex için `untrusted_repo_for_unconfined_provider`.
3. **17:07:** "sandbox olarak kur, eğer Claude de aynıysa": Claude Code'da doğrulanmış OS düzeyi dosya izolasyonu yok (koşul sağlanıyor); fakat kurulum UAC + makine genelinde hesap/güvenlik duvarı/ACL değişikliği gerektirdiği için **ertelendi, Yusuf'un yönetici adımı gerekir**. Ayrıntı ve geri alma: kasa `2026-10-21 AgentMom Codex elevated sandbox plani.md`.

**Kalan risk (belgelenmiş):** Codex salt-okunur kipte dosya sistemini okuyabilir; güvenilen kök içinde bile oturum belirteci ağacı, audit veritabanı ve kök dışı dosyalar okunabilir. Claude Code'da Bash reddi korunur; dosya araçları istem kapalı olduğundan çalışma dizinine bağlıdır (gerçek çalıştırmayla doğrulanmadı).
