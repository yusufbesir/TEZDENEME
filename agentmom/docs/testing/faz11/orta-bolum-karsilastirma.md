<!-- Sahip: Claude [İP:AgentMom Faz 11]. Orta sohbet bölümü: Yusuf'un referansı ile AgentMom karşılaştırması ve tasarım eleştirisi. Görüntüler ÖRNEK VERİ (fixture) içerir, gerçek veritabanına yazılmadı. Referans görüntü kasadadır (depoya konmadı). -->
# Orta bölüm: referansa benziyor mu? (Faz 11, dilim 2)

Yan yana görüntü (referans + AgentMom): kasada `notlar\ekler\AgentMom-faz11-karsilastirma-referans-yan-yana-2026-10-22.png`. AgentMom ekranları: `docs/testing/faz11/ui-masaustu-demo-topic2-panel.png` (örnek veri), `ui-masaustu-demo-panel.png`, `ui-dar-demo.png`.

## Dürüst düzeltme
Dilim 1 sonunda orta bölüm bir **durum panosu** idi (Borçlar/Kararlar/REA… katlanır listeleri); referanstaki sohbet akışına benzemiyordu (Yusuf haklıydı). Dilim 2'de orta bölüm **sohbet akışı** olarak yeniden yazıldı; pano içeriği sağ "Genel bakış" paneline taşındı.

## Benziyor / benzemiyor
| Referanstaki öğe | AgentMom (dilim 2) | Durum |
|---|---|---|
| Orta bölüm = sohbet akışı, pano yok | `chat.js`: kullanıcı/asistan/araç/onay öğeleri; pano sağ panelde | Benziyor |
| Asistan yanıtı balonsuz düz metin, geniş satır aralığı | `am-chat` düz metin, 1.7 satır aralığı, `AM_MD` ile güvenli markdown | Benziyor |
| Kullanıcı mesajı sağa hizalı yuvarlak koyu kutu + küçük gri not | sağda indigo-menekşe kutu + "Bir konuya gönderildi" notu | Benziyor (renk özgün: indigo, referans: kahverengi-turuncu) |
| Satır içi kod = kırmızımsı monospace kutu, bağlantı çipi | `--am-code-bg/fg` + yalnız http/https bağlantı çipi | Benziyor |
| Bölümler arası 'Yeni' ayracı (dalgalı turuncu çizgi) | ince çizgi + turkuaz "Yeni" hapı | Kısmen (çizgi düz; dalga yok, bilinçli sadelik) |
| Katlanır araç kartları (⏺/⎿ mantığı) | katlanır kartlar: durum düğümü + ad + özet + zaman | Benziyor |
| Satır içi izin kartı | "İzin isteniyor": görev/eylem/hedef + İzin ver/Reddet; eylem ve hedef yalnız yetkili görev kaydından | Benziyor (+ daha sıkı güvenlik) |
| Ek dosya çipleri girişin üstünde | `#attachRow` (dosya yükleme yok: yalnız gösterge) | Kısmen |
| Büyük yuvarlak giriş kutusu, `+`, model/mod, gönder | var; model rozeti = **gerçek model** ya da "Yerel kip · model çağrısı yok" | Benziyor |
| Model yanında kullanım halkası + açılır pencere | bağlam doluluğu halkası + açılır pencere (sağlayıcı sınırı yalnız doğrulanabilirse) | Benziyor (anlamı farklı: bağlam, plan sınırı değil) |
| "Genel bakış" düğmesiyle sağ panel | `#overviewBtn` / Ctrl+. ; Konular/Onaylar/Değişiklikler/Zamanlanmış | Benziyor |
| Sol menü: ara, Yeni, Projeler, Sabitlenmiş, alt oturumlar | var; alt oturum adı **kullanıcının**, yanında **gerçek model rozeti** ve uyuşmazlık uyarısı | Benziyor (+ yalan söylemeyen etiket) |
| Kullanıcı menüsü yukarı açılır | var; API anahtarı/plan/fatura/mağaza **yok** | Benziyor (bilinçli farklar) |
| Ayarlar modal + aranabilir gruplu gezinme + Yardım | var; Yardım: eğitim belgesi, kısayollar, komutlar, güvenlik sınırları, el kitabı | Benziyor |
| Proje ayarları › Kullanım (yığın çubuk, döküm, konular tablosu) | `usage.js`; veri yoksa "—/veri yok" (uydurma yok) | Benziyor |
| Turuncu vurgu, krem/kahverengi tonlar | indigo-mürekkep + turkuaz; özgün kimlik | Özgün kalacak |
| Düşünme/özet blokları, mesaj eylemleri (kopyala/yeniden dene/düzenle), @ anma, mikrofon | yok | Benzemiyor (dilim 3 adayı) |
| Akış (streaming) yanıt | yok (model çağrısı yok; yalnız kayıt akışı) | Benzemiyor (kapsam dışı) |

## Tasarım eleştirisi (design-critique çerçevesi)
- **İlk izlenim:** sakin, tek vurgu (turkuaz); odak giriş kutusu ve onay kartı. Doğru.
- **Kullanılabilirlik:** onay kartı en belirgin öğe, eylem+hedef ayrı satırlarda; kilit güvenlik akışı 2 tık (kart → pencere). Boş oturumda öneri çipleri yönlendirir.
- **Hiyerarşi:** karşılama başlığı display yazı tipi; sohbet ölçüsü ~690px (okunur satır uzunluğu); sol menüde seçili satır dolgu + sol turkuaz çizgi.
- **Tutarlılık:** belirteçler tek kaynaktan (`tokens.css`); simgeler `AM_ICON` (ortak). Düzeltilen çakışmalar: eksik simge adları (yedek kare), kenar çubuğu üst şeridindeki çift geri/ileri, sütun genişliğinin `Number(null)=0` yüzünden en küçüğe kenetlenmesi, dar ekranda kenar çubuğunun akışa girmesi.
- **Erişilebilirlik (ölçüldü):** koyu tema metin/arka plan 15,2:1, soluk metin 7,4:1 (yüzeyde 5,9–6,7:1), vurgu/zemin 10,4:1, uyarı 9,3:1, tehlike 6,6:1, kod 12,5:1; açık tema metin 16,0:1, soluk 6,0:1, vurgu 5,5:1. Hepsi WCAG AA (≥4,5). Odak halkası, `role`/`aria-*`, durum yalnız renkle değil (şekil + metin), `prefers-reduced-motion`.
- **Açık sorunlar (kabul edilen):** sağ panel sekme çubuğu 380px'te "Zamanlanmış" yatay kayar; kullanıcı menüsünde "Yedek al / Yedekten yükle" kısalır; proje ayarları penceresi tam ortalanmıyor. Hepsi görsel, işlev etkilenmez.

## Kullanılan tasarım yetenekleri
`frontend-design` (kimlik planı: özgün palet/tipografi/yerleşim, "ağ düğümü" işareti, kaçınılacak kalıplar) ve `design:design-critique` (yukarıdaki çerçeve). `accessibility-review` bu oturumda yüklenemedi; yerine kontrast ölçümü ve ARIA/klavye taraması (modül testleri + gerçek Edge) yapıldı. Figma/Adobe araçları kullanılmadı (gerek yok, yazma izni verilmedi).
