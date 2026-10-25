<!-- Sahip: Claude [İP:AgentMom Faz 11]. Eğitim belgesi; yalnız Claude değiştirir, silme kararı yalnız Yusuf'undur (Geri Dönüşüm Kutusu). Kaynak türü: kendi yazımımız (lisans: own). Kod, görsel, yazı tipi ve metin başka uygulamalardan KOPYALANMADI; yalnız yapı ve akış anlatılır. -->
# Masaüstü yapay zeka ajan uygulamaları nasıl çalışır?

Bu belge Yusuf için, "Claude masaüstü, Codex, Cursor gibi uygulamalar içeride nasıl kurulu ve AgentMom bunu nasıl kendi yoluyla yapıyor?" sorusunu sade bir dille anlatır. Her bilginin yanında **kaynağı** yazılıdır:

- **[Gözlem]**: bu bilgisayardaki kurulu uygulamaların dosya yapısına salt-okunur bakılarak görüldü (REA taraması, 2026-10-22). Yalnız dosya adları, paket bildirimi (manifest) ve Electron sigortaları (fuse) okundu; uygulama kodu açılıp kopyalanmadı.
- **[Genel bilgi]**: bu tür uygulamaların bilinen çalışma biçimi; bu cihazda doğrulanmadı.
- **[AgentMom]**: AgentMom'da bunun karşılığı ve dosyası.

> Taranamayanlar: **Antigravity** ve **Cursor** bu cihazda kurulu değil (yalnız `AppData\Roaming\gemini` klasörü var). Onlar için hiçbir şey uydurulmadı; aşağıda yalnız "Genel bilgi" etiketiyle ve kısaca geçerler.

---

## 1. Büyük resim: bir masaüstü ajan uygulaması dört katmandır

```
 ┌────────────────────────────────────────────────────────────┐
 │ 1) KABUK        pencere, simge, tepsi, güncelleme, başlatıcı │
 ├────────────────────────────────────────────────────────────┤
 │ 2) ARAYÜZ       sol menü · sohbet · sağ panel (web sayfası)   │
 ├────────────────────────────────────────────────────────────┤
 │ 3) BEYİN/ARACI  oturumlar, konular, alt ajanlar, onaylar      │
 │    (ana süreç)  → motoru (model CLI'sını) çalıştırır          │
 ├────────────────────────────────────────────────────────────┤
 │ 4) DEPO         oturum kayıtları, ayarlar, kimlik, önbellek   │
 └────────────────────────────────────────────────────────────┘
        sınır: arayüz ↔ ana süreç ↔ model/araçlar (güvenlik burada)
```

Önemli fikir: **arayüz bir web sayfasıdır**, "gerçek iş" ise arkada çalışan ayrı bir süreçte olur. Arayüz yalnız gösterir ve istek yollar; karar ve izin arka tarafta verilir.

## 2. Kabuk (pencereyi kim açar?)

**[Gözlem] Claude masaüstü**: Electron tabanlı. `claude.exe` (~234 MB) Chromium + Node'u içerir; uygulama mantığı `resources\app.asar` (~47 MB) içinde paketlidir. Yanında yardımcı programlar var: `cowork-svc.exe` (paket servisi olarak çalışan arka plan hizmeti), `claude-ssh-*` üç küçük yardımcı (uzak bağlantı), `chrome-native-host.exe` (tarayıcı eklentisiyle konuşma köprüsü), bir sanal disk (`smol-bin.x64.vhdx`, yalıtılmış çalışma ortamı için), tepsi simgeleri ve çok dilli metin dosyaları (`*.json`). Paket bildirimi: `claude://` adres şeması, isteğe bağlı açılışta başlatma, güvenlik duvarı kuralları.
Electron "sigortaları" sıkı: dışarıdan Node olarak çalıştırma kapalı, hata ayıklama bayrakları kapalı, uygulama yalnız `app.asar` içinden yüklenir ve bütünlük doğrulaması açık.

**[Gözlem] Codex masaüstü**: yine Chromium kabuğu (`chrome.dll`, `ChatGPT.exe`) ama "beyin" ayrı bir yerel program: `resources\codex.exe` (~325 MB, komut satırı ajanı). Yanında: `codex-command-runner.exe` (komutları çalıştıran), `codex-windows-sandbox-service/setup.exe` (Windows'ta yalıtım), `codex-code-mode-host`, `rg` (hızlı arama), `plugins`, `skills`, bildirim sesi. `codex://` adres şeması ve OAuth dönüşü için yalnız yerel döngü (127.0.0.1) portları (1455, 1457) bildirimde açıkça yazılı.

**[Genel bilgi] Alternatifler**: Electron (her şey paketli, büyük), Tauri (sistemin WebView2'sini kullanır, küçük ama Rust gerekir), saf WebView2, ya da "tarayıcıyı uygulama kipinde aç" (en hafif).

**[AgentMom] Seçimimiz**: ek bağımlılık yok; **Edge uygulama kipi**. Başlatıcı `masaustu/AgentMom.vbs` → `src/desktop/launcher.ts`:

```
 çift tık
    │
 AgentMom.vbs (konsol açmaz)
    │
 launcher.ts ── tek-örnek kilidi? ──evet──► çalışan sunucuya yeni pencere aç
    │ hayır
    ├─ src/server/main.ts'i GİZLİ başlat (günlük: agentmom-state\desktop\server.log)
    ├─ sunucu /health cevap verene dek bekle
    ├─ sunucudan TEK KULLANIMLIK bilet al (belirteç komut satırına girmez)
    ├─ msedge --app=http://127.0.0.1:8787/desktop/enter?t=<bilet>
    │        --user-data-dir=<AgentMom'a özel D: profili>   (kendi pencere, kendi simge)
    └─ pencere kapanınca sunucuya "düzgün kapan" de (veritabanı kapanır), kilidi boşalt
```

Neden bilet? Komut satırını aynı kullanıcının başka programları okuyabilir. Kalıcı oturum belirteci oraya yazılırsa sızar. Bilet 30 saniyelik, bir kez geçerli, rastgele; sızsa bile işe yaramaz (`src/server/desktop-entry.ts`).

## 3. Arayüz (üç sütun)

**[Gözlem]** Claude ve Codex arayüzleri Chromium içinde çalışan web sayfalarıdır; yerel metin dosyaları (`locales`, `*.json`) çok dilli metinleri tutar.
**[Genel bilgi]** Ortak yerleşim: **sol** = gezinme (yeni oturum, projeler, geçmiş), **orta** = sohbet akışı (kullanıcı balonu, asistan metni, katlanır araç kartları, satır içi onay), **sağ** = yan panel (konular, değişiklikler, onaylar). Pencere daralınca sütunlar çekmeceye iner.

```
 ┌ sol menü ──┬──────── sohbet ─────────────┬─ sağ panel ─────────┐
 │ Ara        │ Kullanıcı: "şunu yap"       │ Konular             │
 │ Yeni       │ Asistan: "tamam, başlıyorum"│  ▸ Sizi bekleyenler │
 │ Projeler   │ [araç kartı ▸ dosya yazıldı]│  ▸ Çalışıyor        │
 │ Sabitlenmiş│ [İzin ver] [Reddet]         │  ▸ Boşta · Çözülmüş │
 │  ● alt-1   │ ─────────────────────────── │ Onaylar · Değişiklik│
 │  ● alt-2   │ [yazı kutusu] model · mod ◯ │                     │
 └────────────┴─────────────────────────────┴─────────────────────┘
```

**[AgentMom]** Şu an: `src/server/ui/` (düz HTML/CSS/JS, bağımlılık yok, sıkı CSP, metin her zaman `textContent` ile). Dilim 2'de yeni üç sütunlu masaüstü arayüzü ve bu belgeyi gösteren **Ayarlar → Yardım** gelir.

## 4. Oturum, konu ve alt ajan modeli

| Kavram | Ne demek | AgentMom'da |
|---|---|---|
| **Oturum** | Bir sohbet + ona bağlı bütün araç çağrıları, dosyalar, durum | görev (`TaskStore`), çalıştırma kaydı |
| **Konu** | Kullanıcının izlediği iş birimi; durumu: bekliyor / çalışıyor / boşta / çözüldü | iş akışı (`WorkflowStore`) |
| **Alt ajan** | Ana ajanın başlattığı yardımcı oturum; kendi modeli ve izni vardır | sağlayıcı çalıştırması (Claude/Codex/Gemini adaptörü) |
| **Onay isteği** | Ajanın riskli eylem için kullanıcıya sorusu: eylem + hedef | politika motoru `require_approval` |
| **Mod** | Ne kadar izin verildiği: her işlem sorar / salt okunur / otomatik | sözleşme (`AutonomyContract`) |

**[Gözlem]** Claude masaüstü verilerinde ayrı klasörler var: `claude-code-sessions`, `local-agent-mode-sessions`, `scratch-workspaces`, `git-shadow`, `claude-code-vm` (kod oturumu, yerel ajan oturumu, geçici çalışma alanı, git gölgesi, yalıtılmış VM). Codex'te `sessions`, `archived_sessions`, `sqlite`, `automations`, `skills`, `plugins`, `rules`, `thread-writer-locks` (aynı konuya iki yazıcı olmasın diye kilit). Çıkarım: oturum = diskte kalıcı kayıt; arşivleme ayrı klasör; kilit dosyaları eşzamanlı yazmayı önler.

**Tasarım dersi (AgentMom için)**: alt oturumun **adını kullanıcı verir** (ajan değiştiremez); **modeli ise sistem verisidir** ve satırda ayrı rozet olarak gerçek model gösterilir. Ad "OPUS" dese bile çalıştırma kaydındaki gerçek model Sonnet ise uyarı çıkar. Böylece etiket yalan söyleyemez, sessiz model düşmesi görünür olur.

## 5. Onay akışı (en önemli güvenlik fikri)

```
 ajan: "src/a.ts dosyasını yaz"
    │
 [politika motoru] ── deny? ──► reddedildi (neden yazılır)
    │ allow          ── require_approval? ──► ONAY KARTI: eylem + hedef + neden
    │                                         │ kullanıcı: İzin ver / Reddet
    ▼                                         ▼
 çalıştır  ◄───────────────────────────── (yalnız kullanıcı onaylayabilir;
 denetim kaydı                              ajan belirteci onay veremez)
```

- **[Genel bilgi]** İyi uygulamalar onayı arayüzde değil **arka tarafta** zorunlu kılar; arayüz yalnız soruyu gösterir.
- **[AgentMom]** `src/core/policy/engine.ts`: sözleşme (izinli klasörler, yasak klasörler, izinli eylemler, onay isteyen eylemler); yalnız kullanıcı katmanı politikayı genişletebilir; her karar denetim kaydına yazılır; ajan belirteci yalnız görev oluşturabilir.
- Satır içi **İzin ver / Reddet** kartları sohbet akışında görünür (Faz 10).

## 6. Durum ve depolama

| Veri | Claude/Codex'te (gözlem) | AgentMom'da |
|---|---|---|
| Ayarlar | `config.json`, `claude_desktop_config.json`, `.codex-global-state.json` | `agentmom.config.json` + kullanıcı katmanı (depo dışı) |
| Oturumlar | oturum klasörleri / `sqlite` | SQLite (`data/`) + denetim JSONL |
| Kimlik/anahtar | ayrı dosyalar (`auth.json`, kimlik dosyası) | **hiç anahtar yok**; yalnız oturum belirteci, depo dışı `agentmom-state\token` |
| Önbellek | `Cache`, `GPUCache`, `IndexedDB`… (Chromium) | yok (arayüz statik) |
| Geçici | `scratch-workspaces`, `tmp` | `agentmom-state\worktrees`, `provider-tmp` |

Kural: **gizli veriyi ve politikayı genişleten ayarı, ajanın yazabildiği yerde tutma.** AgentMom bunu zorlar: kullanıcı yapılandırması depo ve durum klasörünün **dışındadır** (açılışta kontrol edilir).

## 7. Güvenlik sınırları

1. **Arayüz ↔ ana süreç**: Electron'da `contextIsolation`/sigortalar; AgentMom'da aynı köken, sıkı CSP (`default-src 'none'`), belirteç URL parçasında (sunucuya gitmez) ve adres çubuğundan hemen silinir.
2. **Ana süreç ↔ model/araç**: komutlar yalıtılmış çalışma ağacında; izin listesi; Windows'ta Codex için ayrı sandbox servisi **[Gözlem]**.
3. **Pencereyi açan komut satırı**: belirteç yok, tek kullanımlık bilet (AgentMom'a özgü).
4. **Dış içerik veridir**: web sayfası, e-posta, dosya içindeki talimatlar komut değildir.
5. **Silme**: kalıcı silme yok; yalnız Geri Dönüşüm Kutusu ve kullanıcı kararı (davranışsal kural).

## 8. Güncelleme ve paketleme

**[Gözlem]** Claude ve Codex Microsoft Store/MSIX paketidir (paket bildirimi, imza, otomatik güncelleme, paket servisleri). **[AgentMom]** Şimdilik: `D:\Programlar\AgentMom\` altında başlatıcı + simge + kısayol betiği; kod `D:\YusufII\Projeler\agentmom`. Gerçek bir kurulum/kaldırma programı ve sürüm güncelleme satırı sonraki dilimlerde.

## 9. AgentMom'da hangi parça nerede?

| Parça | Dosya |
|---|---|
| Başlatıcı, tek örnek, düzgün kapanış | `src/desktop/launcher.ts`, `masaustu/AgentMom.vbs` |
| Tek kullanımlık giriş bileti | `src/server/desktop-entry.ts`, `/desktop/enter`, `/api/desktop/ticket` |
| Düzgün kapat | `/api/desktop/quit` + `src/server/main.ts` |
| Simge | `scripts/make-icon.mjs` → `src/desktop/assets/agentmom.ico` |
| Politika / onay | `src/core/policy/engine.ts` |
| Oturum / görev / iş akışı | `src/core/tasks`, `src/workflows` |
| Sağlayıcı (motor) adaptörleri | `src/providers/*` |
| Arayüz | `src/server/ui/*` |
| REA (araştırma kayıtları) | `src/rea/rea.ts` |

## 10. Sözlük

- **Electron**: web sayfasını masaüstü penceresinde çalıştıran çatı (Chromium + Node).
- **MSIX**: Windows'un imzalı uygulama paketi.
- **Sigorta (fuse)**: Electron programına gömülü açma/kapama anahtarı (ör. dışarıdan Node olarak çalıştırmayı kapatır).
- **CSP**: tarayıcıya "bu sayfa yalnız şu kaynakları yükleyebilir" diyen kural.
- **Sandbox**: komutların sınırlı alanda çalıştırılması.
- **REA**: bu projede araştırma ve öneri kayıt akışı; kod kopyalamaz, yapı öğrenir.


---

# Ek: Antigravity, Cursor ve OpenCode taraması (Faz 11, 2026-10-22)

> Sahip: Claude [IP:AgentMom Faz 11]. Bu bölüm önceki içeriğe eklendi; öncekiler değiştirilmedi.
> Etiketler: **[Gözlem]** kurulu uygulamada dosya adı/alan adı/pencere gözlemi, **[Genel bilgi]** üreticinin herkese açık belgelerinden bilinen davranış (bu taramada çalıştırılıp doğrulanmadı), **[AgentMom]** bizim projeye çıkarım.
> Yöntem (REA ilkesi): kod, metin, görsel ve yazı tipi kopyalanmadı; yalnız yapı, dosya adları, `package.json` alan adları, fuse durumu ve açılış penceresi gözlendi. Üçü de hesap/oturum açtırmadan veya model çağrısı yapmadan kapatıldı. Kurulum ayrıntıları: `docs/testing/faz11/kurulum-kaydi.md`. Ekran görüntüleri: `docs/testing/faz11/tarama/`.

## 11. Üçünün ortak yapısı (özet)

| Özellik | Antigravity | Cursor | OpenCode |
|---|---|---|---|
| Sürüm | Antigravity uygulaması (hub) 2.25.0 | 3.26.16 | 1.19.3 |
| Kabuk | Electron (kabuk ince) | Electron (VS Code çatalı) | Electron (ince kabuk + yerel sunucu) |
| Kurulum biçimi | NSIS, kullanıcı bazlı | Inno Setup, kullanıcı bazlı | NSIS, kullanıcı bazlı |
| İkili imza (kurulum paketi) | Geçerli, Google LLC | Geçerli, Anysphere, Inc. | Geçerli, Anomaly Innovations, Inc |
| Kurulu ana exe imzası | İmzasız (NotSigned) | Geçerli | Geçerli |
| Electron fuse'ları | Üçünde de aynı varsayılan: RunAsNode açık, NodeOptions ortam değişkeni açık, Node denetim argümanları açık, asar bütünlük doğrulaması kapalı, yalnız asar'dan yükle kapalı, çerez şifreleme kapalı | aynı | aynı |
| Açılışta | Google ile giriş duvarı | "Log In / Sign Up" duvarı | Giriş istemeden oturum ekranı |

[Gözlem] Üç uygulama da Electron'dur ve fuse tablosu bire bir aynıdır; yani üreticilerin hiçbiri varsayılandan daha sıkı bir Electron sertleştirmesi yapmamıştır. Bu, AgentMom'un kendi fuse'larını (önceki bölüm 7) sıkılaştırarak bu üçünden daha güvenli olabileceği anlamına gelir. [AgentMom] Çıkarım: bizim hedefimiz "bu üçünden geri kalmamak" değil, RunAsNode ve NodeOptions fuse'larını kapatmaktır.

## 12. Google Antigravity

### 12.1 Kabuk ve dosya yapısı
- **[Gözlem]** Kurulu uygulama `Antigravity.exe` (Electron) + `resources\app.asar` (yalnız ~4,5 MB) + `resources\bin\language_server.exe` (~170 MB) + `webm_encoder.exe` (~13 MB) + `elevate.exe`. Yani kabuk küçük; ağır iş yerel bir "dil sunucusu" ikilisinde.
- **[Gözlem]** `app.asar` içinde `dist/` altında şu modül adları var: `main`, `preload`, `ipcHandlers`, `hostBridgeServer`, `languageServer`, `ideInstall/` ve `ideInstallService`, `updater`, `tray`, `menu`, `keybindings`, `storage`, `wsl`, `provisionSplash`, `loadingOverlay`, `customScheme`. Her modülün yanında `*.test.js` var (test dosyaları pakete girmiş).
- **[Gözlem]** `package.json` alan adları: `name, productName, version, description, homepage, author, main, dependencies`. Bağımlılık adları: `@connectrpc/connect(-node)`, `@bufbuild/protobuf` (yani dil sunucusuyla gRPC benzeri protobuf konuşma), `chrome-devtools-mcp` (tarayıcı ajanı için MCP), `electron-updater`, `electron-log`, `shell-env`, `js-yaml`.
- **[Gözlem]** İndirme sayfasında üç ayrı ürün görünüyor: "Antigravity" uygulaması (hub, 2.25.0), "Antigravity IDE" tek başına (2.5.5) ve komut satırı sürümü (1.4.4). Hub içindeki `ideInstall` modülü, IDE'nin hub tarafından ayrıca kurulabildiğini düşündürür. Bu taramada yalnız hub kuruldu.
- **[Gözlem]** Kullanıcı durumu C: üzerinde `AppData\Local\antigravity-updater` altında; ana veri klasörü ilk açılışta oluşmadı (giriş yapılmadığı için).

### 12.2 Arayüz ve akış
- **[Gözlem]** Açılış penceresi koyu temalı karşılama: "Welcome to Antigravity", "Continue with Google", "Use Business Account", "Having trouble signing in?". Girişe geçilmedi; ana arayüz görülemedi. Ekran görüntüsü: `tarama/antigravity-pencere.png`.
- **[Genel bilgi]** Antigravity'nin tanıtılan tasarımı iki yüzeydir: ajan yöneticisi (birden çok ajanı ve çalışma alanını yöneten pano) ve editör (VS Code tabanlı). Ajan, çıktıları "artifact" denen belgelerle gösterir: görev listesi, uygulama planı, tarayıcı ekran görüntüleri/kayıtları ve yapılan işin özeti. Kullanıcı bu belgelere yorum bırakarak ajanı yönlendirir.
- **[Genel bilgi]** İzin modeli: terminal komutları ve inceleme için ayrı politikalar (her seferinde sor / ajan karar versin / hep ilerle) ve izin/yasak listeleri.
- **[Genel bilgi]** Birden çok ajan paralel çalışabilir; ajan tarayıcıyı da kullanabilir (`chrome-devtools-mcp` bağımlılığı bununla uyumlu **[Gözlem]**).
- **[AgentMom]** Dil sunucusunu uygulamadan ayırma deseni (kabuk 4,5 MB, ağır ikili ayrı) bizim "ince arayüz + ayrı çekirdek" yapımızla aynı yönde.

## 13. Cursor

### 13.1 Kabuk ve dosya yapısı
- **[Gözlem]** `Cursor.exe` + `resources\app\` (açık klasör, asar değil; `node_modules.asar` ayrıca var) + `resources\completions`. VS Code çatalı: `product.json` alan adları arasında `extensionsGallery, builtInExtensions, serverApplicationName, tunnelApplicationName, updateUrl, telemetry/statsig` alanları ve `aiConfig, agentHarnessCdnUrl` gibi Cursor'a özgü alanlar var. `package.json` alanları: `name, version, distro, author, packageManager, main, type, private, repository, bugs` ve `main=./out/main.js`.
- **[Gözlem]** Yerleşik uzantı klasörleri (toplam 117) arasında Cursor'a özgü olanlar bir ajan mimarisini adlarıyla gösteriyor: `cursor-agent-exec`, `cursor-agent-host`, `cursor-agent-worker`, `cursor-local-agent-runtime`, `cursor-always-local`, `cursor-shadow-workspace`, `cursor-worktree-textmate`, `cursor-checkout`, `cursor-commits`, `cursor-browser-automation`, `cursor-computer-use`, `cursor-mcp`, `cursor-retrieval` (kod arama/indeks), `cursor-file-service`, `cursor-deeplink`, `cursor-socket`, `cursor-resolver`.
- **[Gözlem]** `resources\helpers\` altında `cursorsandbox.exe`, `crepectl.exe` ve kendi `node.exe`'si var; `tray-status\` altında "running / attention / unread" durum simgeleri (açık/koyu) var. Yani komutlar için ayrı bir sandbox yardımcısı ve sistem tepsisinde ajan durumu göstergesi mevcut.
- **[Gözlem]** Kullanıcı durumu C: üzerinde `AppData\Roaming\Cursor` (VS Code tarzı: User, logs, Cache, IndexedDB...).

### 13.2 Arayüz ve akış
- **[Gözlem]** Açılışta pencere başlığı "Cursor Agents"; içerik: logo, "The best way to code with AI", "Log In" ve "Sign Up". Giriş yapılmadı. Ekran görüntüsü: `tarama/cursor-pencere.png`. Pencere başlığının "Agents" olması, 3.x sürümünde ana yüzeyin editörden çok ajan penceresi olduğunu düşündürür.
- **[Genel bilgi]** VS Code düzeni: solda dosya gezgini ve oturum/ajan listesi, ortada editör, sağda sohbet/ajan paneli. Modlar: Ask (salt okuma), Plan, Agent (düzenler ve komut çalıştırır). Değişiklikler diff olarak gösterilir, kabul/ret edilir; kontrol noktaları (checkpoint) ile geri alınır.
- **[Genel bilgi]** Onay akışı: araç çağrıları (komut, dosya yazma) için "her seferinde sor" ya da izin listesi; MCP araçları ayarlardan eklenir; kurallar (rules) proje klasöründeki dosyalarla verilir; arka planda ve uzakta çalışan ajanlar vardır.
- **[AgentMom]** `cursor-shadow-workspace` ve `cursor-worktree` adları, ajanın değişiklikleri kullanıcının çalışma kopyasına dokunmadan ayrı bir kopyada deneme fikrini gösteriyor. AgentMom'un politika motoru bu fikri "önce taslak çalışma alanı, sonra kullanıcı onayıyla uygula" olarak alabilir.

## 14. OpenCode

### 14.1 Kabuk ve dosya yapısı
- **[Gözlem]** Resmî sürüm sayfasında Windows için iki biçim var: masaüstü uygulaması (`opencode-desktop-win-x64.exe`, ~126 MB) ve komut satırı zip'i (`opencode-windows-x64.zip`). Masaüstü uygulaması kuruldu.
- **[Gözlem]** `OpenCode.exe` + `resources\app.asar` (~148 MB) + `app.asar.unpacked` (içinde `@lydell\node-pty-win32-x64`, yani sahte terminal). `package.json` alanları: `name, private, version, type, license, homepage, author, main, dependencies, optionalDependencies, desktopName`; paket adı `@opencode-ai/desktop`; bağımlılıklar `electron-store`, `electron-window-state`, `electron-context-menu`, `electron-updater`, `effect`, `drizzle-orm`, `@zip.js/zip.js`.
- **[Gözlem]** `out/main/index.js`, `out/main/sidecar.js`, `out/preload/index.js` ve `out/renderer/` (937 dosyalık varlık klasörü; bir web arayüzü paketi). Çalışırken bir "utility" süreci `127.0.0.1` üzerinde bir TCP portunu dinliyor: arayüz, yerel bir sunucuya (sidecar) bağlanan bir istemci. Aynı arayüz modülleri tarayıcıdaki web sürümüyle ortak (`manifest`, `favicon` dosyaları).
- **[Gözlem]** Arayüz modül adları ayarlar yapısını gösteriyor: `dialog-settings`, `dialog-connect-provider`, `dialog-manage-models`, `dialog-select-mcp`, `dialog-select-directory`, `dialog-select-file`, `dialog-edit-project`, `dialog-fork` (oturumu dallandırma), `dialog-command-palette`, `settings-keybinds`, `new-session`, `diff`, `shellsession` (kabuk oturumu).
- **[Gözlem]** Kullanıcı durumu C: üzerinde `AppData\Roaming\ai.opencode.desktop` ve `AppData\Local\@opencode-aidesktop-updater`.

### 14.2 Arayüz ve akış
- **[Gözlem]** Giriş istemeden açıldı. Üstte sol köşede menü (hamburger) ve çalışma alanı düğmesi, sekmeli oturum şeridi ("Yeni oturum" sekmesi, kapat, yeni sekme +), ortada büyük marka yazısı, altında girdi kutusu: "Bir şey sorun, / komutlar için, @ bağlam için...", kutu içinde ekle (+) düğmesi, model seçici ("Big Pickle"), gönder düğmesi; altında proje seçici ("Default Project") ve "Git yok" göstergesi; en altta "75'ten fazla sağlayıcıya bağlanın" bağlantısı. Arayüz Türkçe yerelleştirilmiş (sistem diline uyum). Ekran görüntüsü: `tarama/opencode-pencere.png`. Hiçbir mesaj gönderilmedi.
- **[Gözlem]** Arayüzde üç sütunlu klasik düzen yok: tek sütun, sekmeli oturumlar; yan paneller (dosyalar, değişiklikler, terminal) oturum içinden açılıyor olmalı (modül adlarından çıkarım, açıp doğrulanmadı).
- **[Genel bilgi]** `/` komutları, `@` ile dosya/ajan bağlamı, `build` ve `plan` ajanları (plan salt okur), `general` alt ajanı, `AGENTS.md` ile proje kuralları, MCP desteği, her aracın izni için `allow / ask / deny` ayarı (`opencode.json`), oturumları paylaşma ve dallandırma. Aynı çekirdek terminal arayüzünde, masaüstünde ve sunucu olarak da çalışır.
- **[AgentMom]** "Arayüz = istemci, çekirdek = yerel sunucu" modeli bizim yapımızla (yerel sunucu + web arayüzü + Electron kabuğu) aynıdır. Bizim farkımız: giriş bileti ve CSP gibi yerel sunucu koruması (önceki bölüm 7), OpenCode'da gözlenmedi.

## 15. AgentMom'a aktarılacak tasarım dersleri

| # | Ders | Kaynak uygulama | AgentMom'a benziyor mu? | Not |
|---|---|---|---|---|
| 1 | Kabuk ince, ağır iş ayrı süreçte/ikilide (dil sunucusu, sidecar) | Antigravity, OpenCode | Benziyor | Bizim `launcher` + yerel sunucu ayrımı aynı yönde. |
| 2 | Arayüz yerel sunucuya bağlanan istemci; aynı arayüz web'de de çalışır | OpenCode | Benziyor | Bizde de web arayüzü var; ek olarak giriş bileti korumamız var. |
| 3 | Varsayılan Electron fuse'ları üçünde de açık bırakılmış | Üçü | Benzemiyor (daha iyi olmalı) | RunAsNode ve NodeOptions fuse'larını kapatalım; asar bütünlüğünü açalım. |
| 4 | Ajan durumu için sistem tepsisi göstergesi (çalışıyor/dikkat/okunmadı) | Cursor, Antigravity (`tray`) | Benzemiyor | Uzun işlerde pencere kapalıyken bildirim için iyi fikir; sonraki dilim. |
| 5 | Değişiklikleri ayrı çalışma kopyasında deneme (shadow workspace, worktree) | Cursor | Benzemiyor | Politika motoruna "önce taslak alan" kipi eklenebilir. |
| 6 | Ajan çıktıları belge olarak (plan, görev listesi, kanıt) ve belgeye yorumla yönlendirme | Antigravity | Kısmen benziyor | Bizim görev/iş akışı kayıtları var; yorumla yönlendirme yok. |
| 7 | Araç izni üç durumlu: izin ver / sor / yasakla | OpenCode, Cursor, Antigravity | Benziyor | `src/core/policy/engine.ts` ile uyumlu; ayar arayüzünden araç başına seçim eklenebilir. |
| 8 | Komutlar için ayrı sandbox yardımcı ikilisi | Cursor (`cursorsandbox.exe`) | Benzemiyor | Bizde sandbox kavramı var, ayrı ikili yok; Windows'ta ayrı yardımcı düşünülebilir. |
| 9 | Oturumu dallandırma (fork), sekmeli oturumlar | OpenCode | Kısmen benziyor | Alt oturum modelimize "dallandır" eylemi eklenebilir. |
| 10 | Giriş duvarı: iki uygulama hesap ister, biri istemez | Antigravity, Cursor / OpenCode | Benziyor (biz hesap istemiyoruz) | Yerel-öncelik ilkesini koruyalım; sağlayıcı bağlantısı sonradan isteğe bağlı. |
| 11 | Test dosyalarının üretim paketine girmesi (Antigravity asar'ında `*.test.js`) | Antigravity | Benzemiyor | Paketlemede test dosyalarını dışarıda tutalım. |
| 12 | Üç ürün tek hesaba sıkı bağlı (yalnız bu sürümlerde giriş duvarı gözlendi) | Antigravity, Cursor | Benzemiyor | İlk açılışta çalışabilen çevrimdışı/yerel mod bizim ayrımcı özelliğimiz. |

**Sınırlar:** Antigravity ve Cursor'un ana arayüzü, ayar sayfaları ve onay akışı giriş gerektirdiği için burada **görülmedi**; ilgili [Genel bilgi] maddeleri üreticilerin açık anlatımlarına dayanır ve doğrulanmamıştır. OpenCode'un menüleri ve ayar iletişim kutuları açılıp gezilmedi; yalnız modül adları ve karşılama ekranı gözlendi.
