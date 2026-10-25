<!--
description: Claude masaüstü uygulamasının arayüz paketinin (ion-dist) STATİK taramasından çıkarılan yapı/ölçü/rol haritası. AgentMom tasarım dersleri için.
sahip/yazan: [Claude#alt-ajan, Yusuf'un AgentMom projesi]
kurallar: Yalnız ölçü, rol ve yapı betimi içerir; kaynak kod, CSS bloğu, SVG/PNG, yazı tipi ve kullanıcıya görünen metin KOPYALANMAMIŞTIR. Değiştirme yalnız dosyanın sahibi yapay zekâ tarafından, Yusuf'un kurallarıyla.
-->

# Claude masaüstü arayüz haritası (statik tarama)

## Özet
- Taranan paket: Claude 2.42304.2.0 masaüstü sürümünün `resources\ion-dist` klasörü (yerel web arayüzü).
- Sohbet/Claude Code oturum arayüzü kod adı **epitaxy**; masaüstü kabuğu **dframe**; ortak tasarım dili **cds** (CSS değişken öneki `--cds-`).
- En değerli dersler: (1) anlamsal renk/yüzey/aralık değişkenleri, (2) yoğunluk (comfortable/compact) ve tema (light/dark/system) eksenleri, (3) tek sohbet sütunu ölçüsü + kenar boşluğu değişkenleri, (4) çok kısa ve tutarlı hareket süreleri (60–450 ms), (5) kullanıcı mesajının "yapışkan istem" olarak sabitlenmesi, (6) onay kartının sabit yükseklikli dock'u.

## 1. Yöntem ve sınırlar
- [Gözlem] `ion-dist\index.html` (46 KB), `client-shell-v1.html`, `assets\v1\` altında 25 CSS, 3548 JS, 340 SVG, 3 wasm, yazı tipi dosyaları (woff/woff2/ttf) ve `i18n\*.json` dizin düzeyinde tarandı. Tarama `grep`/`stat` ile salt okunur yapıldı; hiçbir dosya değiştirilmedi veya kopyalanmadı.
- [Gözlem] Başlıca okunan dosyalar: `c6a992d55-*.css` (1,79 MB; Tailwind + cds temel değişkenleri, tema blokları), `shared-styles-*.css` (dframe/epitaxy kabuk), `c19e90103-*.css` (markdown/kod bloğu/çip), `c0d1f1ea0-*.css` (alt "fc-" yüzen bileşen), `c3fde7009-*.css` (belge önizleme), `c403c4b83-*.css` (durum göstergesi), JS parçaları `c227f4d5e-*` (giriş kutusu, 518 KB), `c0fbbe82d-*` (sanal transkript, 57 KB), `c05b96c7f-*` (araç kartları, 189 KB).
- Tarayamadıklarım / sınırlar: (a) JS küçültülmüş (minified); bileşen ağaçlarını satır satır okumak yerine anahtar sözcük sayımı, `data-testid`, `role`, `aria-*`, CSS sınıfı ve değişken adları üzerinden çıkarım yapıldı. (b) Hiçbir pencere çalıştırılmadı; piksel düzeni (gerçek render) görülmedi, ölçüler CSS değişkenlerinden okundu. Aynı değişkenin yoğunluğa/boyuta göre birden çok değeri var; "aralık" olarak verildi, hangisinin hangi moda ait olduğu her yerde doğrulanmadı. (c) `app.asar` (ana süreç/preload) açılmadı. (d) `i18n` çeviri dosyalarına metin için bakılmadı (yasak); yalnız dizin düzeyi. (e) `AppData\Roaming\Claude` altına dokunulmadı. (f) Oturum açma sonrası yalnız çalışma anında yüklenen/uzaktan gelen bileşenler (sunucu tarafı) taranamaz.
- Etiketler: [Gözlem] dosyadan görüldü; [Çıkarım] gözlemlerden türetildi; [Genel bilgi] bilinen ürün/UX bilgisi.

## 2. Düzen (3 sütun ölçüleri)
- [Gözlem] Kök: `.dframe-root` (kabuk), içinde `.dframe-sidebar` (sol), `.dframe-pane` ızgara sütunları (`--pane-col`; `dframe-pane-primary`, `dframe-pane-extra`, `dframe-pane-resize-col/row/corner`) ve `.dframe-header`. `--df-chrome-bar-height` 36 px (özel başlık çubuğu, yoksa 0); `--df-header-h` 48 px; macOS pencere düğmeleri için `--df-traffic-light-spacer` 74 px.
- [Gözlem] Sol menü: `--df-sidebar-width` 288 px; daraltılmış/yüzen halde `.dframe-sidebar-body` genişliği 280 px, en çok yükseklik 70vh, köşe `--df-radius-card` 8 px, giriş animasyonu (-6 px kayma + .98 ölçek).
- [Gözlem] Orta sohbet sütunu: `--chat-column-measure` 720 px (genel sütun; bazı yerleşimlerde 850 px "overview" ölçüsü); `--chat-gutter` 32 px (dar yerleşimde 16/12/0 px); sağ/sol ayrı `--chat-gutter-start/end`. "Oturum rayı" (session-rail) için `--session-rail-w` 17,5 rem (=280 px), kenar `--session-rail-gutter` 24 px, ölçü 768/960/1280 px seçenekleri.
- [Gözlem] Pane aralığı: `--cds-panel-gap` ve `--cds-panel-inset` 8 px; panel köşesi `--cds-panel-radius` 10–12 px; `--df-pane-trailing-gutter` 8 px; yeniden boyutlandırma tutamacı `dframe-resize-handle`.
- [Gözlem] Sağ panel: `epitaxy-side-pane`, `epitaxy-pane-window` (ayrı pencereye çıkarılabilir; üst sol boşluk 68 px + 8 px), içerik türleri için bkz. §7.
- [Çıkarım] Düzen = "sol gezinme (288) | orta sohbet (720 ölçü, kalan alan boşluk) | sağ bağlamsal panel (değişken)" ve orta sütun daima ortalanmış ve ölçü sınırlı; sağ panel açılınca sohbet sütunu `--chat-gutter` ile kayıyor.
- AgentMom karşılığı önerisi: sol 260–288 px daraltılabilir; orta sütun 720 px ölçü + 24–32 px kenar; sağ panel yeniden boyutlanır ve ayrı pencereye çıkarılır; 8 px panel aralığı.

## 3. Orta sohbet bölümü bileşen envanteri
Her madde: [Gözlem] ve AgentMom önerisi.
1. **Sanal transkript** — [Gözlem] `epitaxy-virtual-transcript` (sanal kaydırma, satır tahmini `--chat-row-estimate` 3 rem), `epitaxy-transcript-surface`, `epitaxy-transcript-region`, `epitaxy-transcript-typography` (yazı boyutu bağlamı), `epitaxy-scroll-clamp` (üst/alt 8 px kayma gölgesi çizgisi). AgentMom: uzun oturumlar için sanallaştırma + kayma ucu gölgesi.
2. **Kullanıcı mesajı** — [Gözlem] `epitaxy-user-turn`, giriş animasyonu `epitaxy-user-enter` (sağdan ölçeklenme kökeni), `epitaxy-sticky-prompt-bubble` + `-clip`: kullanıcının son istemi kayarken üstte yapışkan kalıyor. Balon değişkenleri: `--cds-message-bubble-radius` (radius+4 px ya da 24 px), iç boşluk x=16 px / y=12 px, en çok genişlik min(85%, 29,5 rem), balonlar arası 2–4 px; zemin rengi tema ailesi rengi (aqua/mavi/gri) %10–16 karışımı (`--feed-bubble-mix`). AgentMom: sağa hizalı tonlu balon + yapışkan istem özeti.
3. **Asistan mesajı** — [Gözlem] Balonsuz düz metin akışı; `--cds-assistant-message-text-inset` 0–4 px; `epitaxy-markdown` kolon akışı, öğe aralığı `--chat-item-gap` (= gövde × satır yüksekliği × .5 ≈ 10 px). Dönüşler arası `--chat-turn-gap` (≈ ×.75 ≈ 15 px). AgentMom: asistan balonsuz, kullanıcı tonlu balon.
4. **Düşünme/özet blokları** — [Gözlem] `epitaxy-thinking-shimmer` ve `cds-shimmer-text-*` (metin üzerinde ışık bandı, tepe rengi metin renginin %20–30'unun beyazla karışımı); JS'te `thinking`, `redacted_thinking`, `tool_use_summary`, `progress_summary` blok türleri. AgentMom: daraltılabilir düşünme bloğu + canlıyken shimmer.
5. **Araç çağrısı kartları** — [Gözlem] `c05b96c7f` içinde `tool_use`/`tool_result` işleme; `tool-card-crashed` (çöken kart hata durumu); dosya yazma/düzenleme/okuma, bash, powershell, web_fetch, görüntü galerisi, "rich_content" ayrı kart türleri; `epitaxy-card-outline*` (kart çerçeve katmanı), `epitaxy-code-card`, `epitaxy-task-card-surface`, `epitaxy-task-row-secondary`. AgentMom: tür başına kart şablonu + çöküş hata kartı; çıktı varsayılan kapalı.
6. **Onay isteği kartı** — [Gözlem] `epitaxy-approval-card` (dock yüksekliği tabanı `--approval-dock-floor` 144 px), `epitaxy-approval-actions`, `approval-answer-withheld`, `epitaxy-answer-option` + `epitaxy-radio-mark` (soru/seçenek), `epitaxy-question-receipt` (verilen cevabın makbuzu), `epitaxy-perm-mode-acks`. AgentMom: giriş kutusunun hemen üstünde sabit onay dock'u, cevaplanınca makbuza dönüşür.
7. **Kod bloğu** — [Gözlem] `epitaxy-codeblock` (üst/alt kenar 4 px tümleç), `epitaxy-code-scroll` (yatay kaydırma, 8 px çubuk), `epitaxy-fence`, mermaid yer tutucusu (`epitaxy-mermaid-fence-placeholder`), sözdizimi vurgusu için ayrı işçi (`highlightWorker`, 1,5 MB). Satır içi kod: mono, gövde −1 px, `--cds-alpha-1` zemin, köşe 4 px, iç boşluk 1×2 px; bağlantı içindeki kod vurgu rengi.
8. **Markdown** — [Gözlem] Başlıklar: h1 1,143 em, h2 1,071 em, h3 1 em (yarı kalın, harf aralığı −.01 em); listeler 20 px girinti, madde aralığı `--cds-pad-sm`; alıntı: 2 px sol çizgi (`alpha-2`) + ikincil metin rengi; yatay çizgi .5 px; `kbd` tuş stili (2 px alt kenar, köşe 4 px); dipnot, görev listesi, KaTeX matematik; tablo `epitaxy-table-scroll` + `epitaxy-table-expand` (yatay kaydırma + genişlet).
9. **Bağlantı çipi** — [Gözlem] `epitaxy-link-chip` (geçersiz bağlantıda üstü çizili sahte katman), `epitaxy-code-chip`, `epitaxy-document-image-chip`, dosya başvurusu `epitaxy-file-ref`. AgentMom: dosya/URL çipleri; ölü bağlantı çizili.
10. **"Yeni" ayracı / okunmamış** — [Gözlem] Transkript parçasında "unread/divider" anahtarı bulunamadı (0). Oturum düzeyinde okunmamış işareti kenar çubuğunda (`df-tab-dot-running`, `status-dot`). [Çıkarım] Bu uygulamada mesaj içi "yeni" ayracı yok. AgentMom: gerekirse özgün.
11. **Akış davranışı** — [Gözlem] Metin akarken `fadeInText`/`grapheme-reveal` anahtar kareleri (harf düzeyinde belirme), `message-fade-up`; çalışma göstergesi `cds-working-dot-*` (halo/iniş/örtü), `urm-*` (durum halkası/kuyruk yıldızı).
12. **Otomatik kaydırma / en alta git** — [Gözlem] Transkript parçasında `anchor` ve `scroll` tutamakları; `scroll-to-bottom` düğmesi birden çok parçada (10 dosya) geçiyor; yapışkan kaydırma ölçütü sabit adı bulunamadı. [Çıkarım] Kullanıcı yukarı kaydırınca otomatik yapışma bırakılıyor, alt düğme çıkıyor (genel bilgi + bulgu uyumlu).
13. **Mesaj eylemleri** — [Gözlem] Eylemler hover'da açılır: `--cds-message-actions-opacity` 0→1, açılış 120 ms `ease-snap`, kapanış 60 ms; beğen/beğenme (`message-rating-thumbs-up/down`); kopyala, yeniden dene, düzenle için erişilebilir etiket (aria-label) kullanımı var (içerik kopyalanmadı). "Düzenlenmiş" etiketi: bu parçalarda ayrı bileşen adı bulunamadı → [Çıkarım] metin düzeyi.
14. **Ek dosya çipleri** — [Gözlem] `file-thumbnail-fade-in`, `file-thumbnail-upload-pulse` animasyonları (yükleme nabzı); `epitaxy-file-image/media`; `dframe-drop-overlay` (sürükle-bırak katmanı + rozet).
15. **Boş/yeni oturum karşılama** — [Gözlem] `greeting-fade-in`, `epitaxy-entry*`, `epitaxy-suggested-task-end`, `epitaxy-split-suggestion`. AgentMom: selamlama + önerilen görev kartları.
16. **Hata/yeniden bağlanma** — [Gözlem] `tool-card-crashed`, `chrome-degraded` (kabuk kısmen bozuk), `err-btn`/`err-sub` (açılış hata ekranı), `composer-foot-status`, banner yuvaları: `df-banner-slot`, `dframe-content-banner`, `dframe-below-header-banner`, `--composer-banners-h`. AgentMom: banner yuvaları üstte+giriş kutusu altında ayrı.
17. **Görev/kuyruk durumu** — [Gözlem] `composer-foot-queued`, `fc-queued-card`, `fc-status-pill` (tam yuvarlak, `border-radius:9999px`), `epitaxy-footer-indicator`, `epitaxy-stats-card`, `epitaxy-status-control`.

## 4. Giriş kutusu
- [Gözlem] `epitaxy-prompt` / `epitaxy-prompt-input`; editör TipTap/ProseMirror (çok satırlı, `contenteditable`, `role=textbox`, `aria-multiline`); giriş yazı boyutu 16 px (mobil yakınlaştırmayı önlemek için taban), istem metni 13/14/15 px ayarlı; kod için satır yüksekliği 1,538.
- [Gözlem] Kapsül: `--cds-radius-composer` 12–14 px; gölge `--code-composer-shadow` (açık %4, koyu %12); gönder hücresi `code-prompt-send-cell`, yan kontroller `code-prompt-trailing-controls`; gönder/durdur tek hücrede.
- [Gözlem] Giriş kutusu parçasında sayımlar: model (274), izin (141), draft/taslak (91), effort/çaba (97), context/bağlam (113), usage/kullanım (157), mention/anma (58), paste (68), attach (37), slash (20), queue (49), folder (75), branch (47), worktree (24). Klavye: Enter, Esc, Tab, ArrowUp/Down, Ctrl/Meta/Shift birleşimleri. Model seçici `epitaxy-cds-model-selector`; dikte düğmesi var; kullanım çubuğu (`aria-valuenow/min/max` ilerleme); `composer-draft-label` taslak etiketi.
- [Gözlem] Alt şerit: `composer-foot-opener/status/reply/queued/disclosure`; yüzen cevap kartı `fc-reply` (yuvarlak köşe=composer yarıçapı), `fc-opener` (40–48 px yuvarlak açıcı).
- [Çıkarım] Kapsül içinde: üstte ek çipleri, ortada çok satırlı editör, altta sol (ek/izin modu/model/çaba) ve sağ (kullanım, dikte, gönder/durdur) denetimleri; üstünde banner/onay dock'u. AgentMom: aynı üç bölge; "izin modu" ve "bağlam doluluk" göstergesi görünür.

## 5. Sol menü
- [Gözlem] `df-session-list`, `df-pills` / `df-pill` (mod sekmeleri; boyut 28–32 px, köşe 6–8 px, `df-pill-indicator`), `df-search-field` (+ `df-search-field-keys` kısayol tuşları), `df-new-circle` (yeni oturum, 18–22 px daire), `df-recents-anchor`, `df-family` (iş kolu gruplaması), `df-described-row` (iki satırlık açıklamalı satır, satır 20–24 px), `df-footer-row/aux`, `df-user-menu-btn`, `df-update-strip` (güncelleme şeridi), `df-tab-dot-running` (çalışıyor noktası; `dframe-dot-pulse/blink`, `dframe-clay-breathe`).
- [Gözlem] Ölçüler: satır yüksekliği `--df-row-h` 26/28/30/32 (açıklamalı 44) px; satır yazısı 13–14 px; grup başlığı 12–13 px, üst boşluk 12–16 px; satır yatay boşluğu 2 px; yığın aralığı 1,5–2 px; ön simge yuvası 24–28 px, simge 16–20 px; alt düğme 24–32 px; hover `--df-hover` (alpha-1).
- [Gözlem] Satır denetimi (`df-row-control`) hover'da açılır; sürükle-bırak yeniden sıralama (`df-drag-shiftable`); sabitlenmiş bölüm (`df-pin-section-reveal`).
- AgentMom: oturum listesi satır 28–32 px, grup başlığı 12 px, çalışan oturum noktası, sabitleme, arama alanı + kısayol.

## 6. Sağ panel
- [Gözlem] `epitaxy-side-pane`, `epitaxy-rail-panel`, `epitaxy-rail-lined`, `epitaxy-side-chat` (yan sohbet), `epitaxy-hub-dock`, `epitaxy-chat-panel`, `epitaxy-terminal-view` (yerleşik terminal), `epitaxy-diff` + Monaco diff editörü (`c5aee9dbd-*.css`), belge önizleme (`epitaxy-document-*`: prose, csv, plaintext, outline, rail ticks, anchor, yazdırma notu, yakınlaştırma), `epitaxy-toc` (içindekiler), `epitaxy-preview-logs-expanded`, `epitaxy-pr-status-block`/`epitaxy-pr-paper` (PR özeti), dosya önizleme (görsel/medya).
- AgentMom: sağ panel sekmeleri = dosya önizleme, fark (diff), terminal, PR/durum, içindekiler.

## 7. Ayarlar penceresi yapısı
- [Gözlem] Sayfa/yol kimlikleri (kişisel alan): `general`, `account`, `billing`, `usage`, `capabilities`, `connectors`, `skills`, `plugins`, `models`, `notifications`, `chat`, `cowork`, `claude-code`, `desktop`, `desktop/extensions`, `desktop/developer`, `artifacts`, `browser-extension`, `source-control`, `github`, `tokens`, `tunnels`, `installations`, `cloud-environments`, `data-privacy-controls`; yönetici alanı: `organization`, `members`, `roles`, `groups`, `directory`, `grants`, `api-access`, `desktop-deployment`, `inference-hooks`.
- [Çıkarım] Sol dikey gezinme + sağ içerik, sayfa kimlikleriyle URL tabanlı yönlendirme; ayar değişikliği öğesi için `data-settings-change-item` işaretçisi (değişiklik vurgulama/arama).
- AgentMom: Genel / Hesap / Modeller / İzinler / Bağlayıcılar / Bildirimler / Geliştirici bölümleri; sayfa kimlikli yönlendirme.

## 8. Tipografi ve boşluk ölçeği
Taban `--cds-rem-scale` bazı yoğunlukta 16/17 (≈ .941). Değerler "rem" × ölçek; piksel yaklaşık.

| Rol | Değişken | Değer(ler) | Not |
|---|---|---|---|
| Gövde | `--cds-font-size-body` | 13 / 14 px | satır `--cds-leading-body` ≈ 19–20 px |
| Sohbet gövdesi | `--chat-body` | 13 / 14 / 15 px | oran `--chat-leading` 1,429 (15 px'te 1,467) |
| Okuma (prose) | `--cds-font-size-prose` | 14 / 16 px | satır 20 / 24 px |
| Başlık | `--cds-font-size-heading` | ≈ 15 px | satır 20 px |
| Başlık büyük | `--cds-font-size-title` | 20 / 22 px | satır ≈ 25–28 px |
| Yazı alt | `--cds-font-size-caption` | 11 / 12 px | satır ≈ 17 px |
| Dipnot | `--cds-font-size-footnote` | 12 / 13 px | |
| Kod | `--cds-font-size-code` | 12 / 13 px | satır ≈ 17–19 px |
| Ağırlıklar | `--cds-font-weight-*` | 400 / 500 / 580 / 600 | değişken eksen wght 360 / 460 / 540 / 560 |
| Aileler | `--cds-font-sans/-mono/-voice` | sans (kurumsal), mono, serif "voice" | sistem yazı tipi geri dönüşlü |
| Boşluk (pad) | `--cds-pad-xs/sm/md/lg/xl` | 4–6 / 6–8 / 8–12 / 12–16 / 20–24 px | yoğunluğa göre |
| Aralık (gap) | `--cds-gap-xs…xl` | 6–8 / 8–12 / 12–16 / 20–28 / 32–40 px | |
| Köşe yarıçapı | `--cds-radius(-xs/-sm/-lg)` | 5–6 / 6–7 / 6–8 / 7–10 px | `--df-radius-card` 8, pill 6–8, panel 10–12, composer 12–14, balon 24 |
| Denetim yüksekliği | `--cds-h-control` | 20–24 (xs/sm) / 24–32 / 28–40 (lg) px | |
| Simge | `--cds-icon` | 12 / 16 / 20–24 px | |
| Z katmanı | `--cds-z-modal/popover/tooltip/toast` | 40 / 50 / 50 / 60 | |
| Temel ızgara | Tailwind `--spacing` | 4 px | |

## 9. Renk rolleri
Kaynak: `--cds-*` anlamsal değişkenleri; tema `data-theme=claude`, mod `data-mode=light|dark|system`, yoğunluk `data-density=comfortable|compact` (kök `html`). Birden çok tema ailesi var (claude, console...). Renk değeri tablosu serbest olduğundan yazıldı.

| Rol | Değişken | Açık | Koyu |
|---|---|---|---|
| Sayfa zemini | `--cds-surface-1` (`--cds-page-bg`) | #fcfcfb (gray-10) | #151515 (gray-850) |
| En dış yüzey | `--cds-surface-0` | #f9f9f7 | #0b0b0b |
| Yükseltilmiş yüzey (panel) | `--cds-surface-2` | #ffffff | #1a1a19 |
| Açılır/araç ipucu yüzeyi | `--cds-surface-3` | #ffffff | #20201f |
| Çizgi | `--cds-border` (alpha-2) | nötr %10 | nötr %10 |
| Güçlü çizgi | `--cds-border-strong` (alpha-3) | %20 | %20 |
| Metin ana | `--cds-text-primary` | nötr-900 (#0b0b0b) | #f0efec |
| Metin ikincil | `--cds-text-secondary` | nötr-600 (#52514e) | #c3c2b7 |
| Soluk metin | `--cds-text-muted` | nötr-400 (#898781) | #898781 |
| Devre dışı metin | `--cds-text-disabled` | alpha-4 (%35) | %35 |
| Vurgu (bağlantı/odak) | `--cds-text-accent`; dolgu `--cds-fill-accent` | #184f95 (mavi-600); dolgu #2a78d6 | #6da7ec; dolgu #2a78d6 |
| Tehlike | `--cds-text-danger`; dolgu danger-450 | #8e2626; dolgu #d03b3b | #ec7e7e |
| Başarı | `--cds-text-success`; dolgu success-450 | #006300; dolgu #009300 | #0ca30c |
| Uyarı | `--cds-text-warning`; dolgu warning-200 | #734500; dolgu #fab219 | #db9300 |
| Marka | `--cds-fill-brand` (clay) | #c6613f (vurgulu), #d97757 | aynı |
| Nötr dolgu (hover) | `--cds-fill-ghost-hover` | nötr %7,5 | beyaz %15 |
| Seçili dolgu | `--cds-fill-ghost-selected` | nötr %15 | |
| Kullanıcı balonu | `--cds-bg-user-message` | tema ailesi rengi %10–16 karışım | aynı mantık |
| Kod arka planı | satır içi kod `--cds-alpha-1` (nötr %5); blok yüzeyi surface-2/3 | | |
| Satır içi kod rengi | `--cds-prose-code-color` | akım rengi | tehlike metin rengi |
| Odak halkası | `--cds-focus-shadow` | iç 1 px sayfa + 1 px vurgu + 6 px parıltı | |
| Gölge | `--cds-shadow-sm/md/lg/popover` | katmanlı iki gölge | koyuda daha koyu (%32/%20) |
| Araç ipucu | `--cds-tooltip-bg` | surface-3 / rol değişkeni | surface-3 |
| İskelet | `--cds-skeleton-base` | nötr %7,5 | |
| Git durumları | `--cds-*-git-added/modified/removed/merged/…` | ayrı set | ayrı set |
- [Gözlem] Her anlamsal renk için `bg / chip / layer / border / fill / on / text` altı biçim var; "role-accent/danger/success/warning/pro" 50–850 ölçekli. [Genel bilgi] Nötrler ılık gri (hafif yeşil-sarı eğimli), vurgu mavi, marka turuncu-kil.
- AgentMom: yüzey 4 kademe, çizgi saydam nötr (%10/%20), metin 4 kademe, rol başına 7 biçim.

## 10. Hareket
- [Gözlem] Süre ölçeği: `--cds-dur-fast` 60 ms, `-snap` 120 ms, `-base` 200 ms, `-sheet` 300 ms, `-slow` 450 ms. Eğriler: `ease-out` cubic-bezier(0,0,.2,1) [ya da (.165,.84,.44,1)], `ease-snap` (.32,.72,0,1), `ease-overshoot` (.34,1.3,.64,1). dframe: 120 ms / 300 ms, `ease-out` (.32,.72,0,1).
- [Gözlem] Örnekler: balon/mesaj `message-fade-up`; mesaj eylemleri 120 ms aç / 60 ms kapa; açılır pop-in 200–220 ms overshoot; kart yükselişi `fc-rise` 200 ms; kenar çubuğu popup 0,3 s; kaydırma ucu solma `cds-scroll-fade-*`; iskelet nefesi `cds-skeleton-breathe`; durum `urm-*`; tuş `--cds-btn-press-sx/sy` (basma ölçeği).
- [Gözlem] Toplam 227 anahtar kare tanımı; hareket azaltma tercihi için `--cds-dur-base:0s` varyantı var (süre sıfırlanır).
- AgentMom: 60/120/200/300/450 ms beş basamak, iki eğri (çıkış + snap), azaltılmış hareket modunda süre 0.

## 11. Erişilebilirlik
- [Gözlem] Giriş kutusunda `role=textbox`, `aria-multiline`; durum alanları `role=status` + `aria-live=polite/off` (6 yerde); kullanım çubuğu `aria-valuenow/min/max`; `aria-busy`; `aria-hidden` (38 süs simgesi); `role=group`, `menuitemradio`, `region`, `note`; simge düğmeler `aria-label` ile.
- [Gözlem] Odak halkası belirgin (`--cds-focus-shadow`), tehlike varyantı `focus-shadow-danger`; RTL desteği (`:dir(rtl)`, `-rtl` anahtar kareleri); disleksi dostu yazı tipi seçeneği (`font-ui-dyslexic`); büyütme için `--cds-rem-scale` ve üç sohbet yazı boyutu; pencere yakınlaştırma uyumu.
- AgentMom: aria-live ile akış duyurusu (kısık), odak halkası, RTL, yazı boyutu seçeneği, hareket azaltma.

## 12. AgentMom'a aktarım
| Konu | Durum | Not |
|---|---|---|
| 3 sütun, ortada 720 px sohbet | Benziyor | sol 280–288, sağ değişken, 8 px panel aralığı |
| Anlamsal değişken katmanı (surface/text/border/role) | Benziyor | ham renk yerine rol adı; açık/koyu/sistem modu |
| Yoğunluk (comfortable/compact) ekseni | Benziyor | boşluk ve satır yüksekliği değişkenleri |
| Asistan balonsuz, kullanıcı tonlu balon | Benziyor | yapışkan kullanıcı istemi eklenebilir |
| Sanal transkript + kaydırma ucu gölgesi | Benziyor | uzun oturumlar için gerekli |
| Onay kartı sabit dock + cevap makbuzu | Benziyor | AgentMom'da onay/izin merkezi çıkarım: çok ajan olduğundan satır başına ajan etiketi eklenmeli |
| Araç kartı türleri (bash, dosya, web, görsel) | Benziyor | AgentMom'da ek: ajan-arası mesaj kartı, izin köprü kartı |
| Sol menü oturum listesi | Benzemiyor | AgentMom'da ajan/çalışma alanı hiyerarşisi (ajan → oturum) gerekir |
| Sağ panel (diff, terminal, önizleme) | Benziyor | AgentMom: ajan günlüğü ve hafıza (Obsidian) görünümü eklenir |
| Düşünme shimmer | Benziyor | |
| Marka rengi (kil turuncu) ve ses | Özgün kalacak | AgentMom kendi vurgu rengi/yazı tipini seçmeli; Claude yazı tipleri/SVG'leri kopyalanamaz |
| Mesaj içi "yeni" ayracı | Benzemiyor | kaynakta yok; AgentMom çok ajanlı akışta özgün tasarlayabilir |
| Ayarlar sayfa kimlikli yönlendirme | Benziyor | |
| Hareket süre ölçeği (60–450 ms) | Benziyor | |

## Kaynak/izlenebilirlik
- Paket yolu (salt okunur): `C:\Program Files\WindowsApps\Claude_2.42304.2.0_x64__pzs8sxrjxfjjc\app\resources\ion-dist`.
- Makine okunur bulgular: `ui-gozlemler.json` (aynı klasör).
