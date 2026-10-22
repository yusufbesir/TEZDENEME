# Model ve efor seçimi tablosu

> **Özet:** Görev türüne göre model ve efor (düşünme derinliği) seçimi bu tabloya göre yapılır. Kaynak: 2026-10-22 web araştırması + kendi bilgim. Sahibi: Yusuf. Değişiklik yalnızca kullanıcının isteğiyle yapılır; kural silinmez, yalnız eklenir. Fable (claude-fable-5-1) yalnız Yusuf açıkça isterse kullanılır (2026-10-21 kuralı geçerli). [İP:Model ve efor seçimi]

## Nasıl kullanılır
1. Görevi aşağıdaki türlerden birine eşle; modeli ve eforu tablodan al.
2. Her zaman en düşük yeterli modelle ve eforla başla. Sonuç yetersizse önce eforu bir kademe artır, olmazsa bir üst modele geç (Haiku, Sonnet, Opus).
3. Alt ajanda model her zaman açık yazılır; efor da tabloda varsayılandan farklıysa yazılır.
4. Oturum ortasında model değiştirmek tüm geçmişi yeniden işlettiği için pahalıdır; model değişimi yeni iş parçacığında yapılır.

## Efor seviyeleri (genel)
| Seviye | Ne için | Not |
|---|---|---|
| low | Basit sorgu, sınıflandırma, çıkarma, yönlendirme, yüksek hacimli işler | En az token; hız öncelikli |
| medium | Rutin düzenleme, özet, belge, standart kodlama | Limiti uzatır; Opus 5.5 ve Haiku 5.5 Claude Code'da varsayılanı budur |
| high | Dengeli kalite/hız; çok dosyalı değişiklik, hata ayıklama | API'de çoğu modelin varsayılanı; Fable 5.1 varsayılanı |
| xhigh | Uzun süren kodlama ve ajan işleri | Opus 4.7 ve yenilerinde var; Anthropic: kodlamada xhigh ile başla |
| max | Doğruluğun maliyetten önemli olduğu en zor işler | Küçük kazanç için çok token harcar; yalnız gerekçeyle |

## Görev türü, model ve efor
| Görev türü | Model | Efor | Gerekçe |
|---|---|---|---|
| Dosya/kod arama, grep, log okuma, dosya listeleme | claude-haiku-5-5 (scout) | low | Derin akıl yürütme gerekmez; alt ajan işinde Haiku önerilir |
| Sınıflandırma, çıkarma, yönlendirme, kısa yanıt, prompt yazma | claude-haiku-5-5 | low | Anthropic Haiku 5.5'i bu işler için konumlandırıyor |
| Özet, sıkıştırma, belge/kayıt düzenleme, test çalıştırıp raporlama | claude-haiku-5-5 | medium | Hacim yüksek, risk düşük |
| Küçük tek dosyalık düzenleme, lint düzeltme, basit test yazma | claude-sonnet-5-5 | low-medium | Rutin kodlama Sonnet'in alanı |
| Özellik geliştirme, hata düzeltme, standart refactor, kurulum betiği | claude-sonnet-5-5 (implementer) | medium | Fiyat/kalite dengesi; çoğu kodlama işinin varsayılanı |
| Kod incelemesi, doğrulama (verifier), PR kontrolü | claude-sonnet-5-5 | medium | Salt okuma ve test; derin akıl yürütme çoğu zaman gereksiz |
| Ofis işi: belge, sunum, tablo üretimi | claude-sonnet-5-5 | medium | Anthropic Sonnet 5.5'i rutin kodlama ve ofis işi için konumlandırıyor |
| Çok dosyalı refactor, bilinmeyen kod tabanı, karmaşık hata ayıklama | claude-opus-5-5 | high | Zor kodlamada Opus; önce high |
| Mimari karar, güvenlik incelemesi, veri bütünlüğü, çok adımlı analiz | claude-opus-5-5 | high-xhigh | Hatanın bedeli yüksek; xhigh uzun ajan işlerinde |
| Orkestrasyon (beyin), planlama, uzun ajan oturumu | claude-opus-5-5 | xhigh | Uzun kodlama ve ajan işi için önerilen seviye |
| Geri alınamaz/riskli işlem (üretim, toplu silme, taşıma) planı | claude-opus-5-5 | xhigh-max | Doğruluk maliyetten önemli |
| Opus xhigh'ta da çözülemeyen açık uçlu çok zor sorun | claude-fable-5-1 | high-xhigh | Yalnız Yusuf açıkça isterse; Opus 5.5'ten ~2,5 kat pahalı, haftalık limitin %50 tavanına yazılır |
| Çok uzun belge/bağlam okuma ve karşılaştırma | claude-sonnet-5-5 veya Opus 5.5 | medium-high | Claude 4.6+ 1M bağlam; yine de bağlam 150k'da parçalanır (proje kuralı) |
| Görsel/video/ses ağırlıklı çok kipli iş | Gemini (beklemede) | - | Kaynaklarda Gemini çok kiplilikte öne çıkıyor; projede Gemini beklemede olduğundan yalnız öneri |
| Hızlı yinelemeli depo düzenlemesi, ikinci görüş | Codex (kurulu) | orta | Bazı kıyaslarda Terminal-Bench'te önde; ikinci görüş için |

## Önemli notlar
- Kaynakların çoğu üçüncü taraf bloglar; model adları ve sayılar birbirini tutmuyor. Sayısal kıyas yerine genel örüntü kullanıldı: Haiku ucuz yüksek hacimli işler, Sonnet çoğu kodlama, Opus zor/mimari iş ve orkestrasyon.
- Tek anahtar kanıt Anthropic Yardım Merkezi: xhigh uzun kodlama/ajan işi için, max en zor ve doğruluğu kritik işler için, low/medium limiti uzatır; Opus 5.5 ve Fable 5.1'de düşünme her efor seviyesinde açıktır.
- Efor etiketleri modeller arasında doğrudan karşılaştırılamaz; bir modelin ayarını başkasına olduğu gibi taşıma.
- Yüksek efor limiti hızlı tüketir (Yusuf 2026-10-21: limitler hızlı gidiyor). Belirsizse bir kademe düşük başla.

## Kaynaklar
- Anthropic Yardım Merkezi, Change the model, effort, and thinking settings: https://support.claude.com/en/articles/8664678-change-the-model-effort-and-thinking-settings
- Best Claude Model for Coding in 2026: https://fast.io/resources/best-claude-model-for-coding-2026/
- Best AI Model for Coding (Morph): https://www.morphllm.com/best-ai-model-for-coding
- AI model routing guide (Augment): https://www.augmentcode.com/guides/ai-model-routing-guide
- Claude Effort Levels Explained (hskylab): https://hskylab.com/tutorials/claude-effort-levels-explained/
- Claude Effort Levels, Fable 5, Opus 5.5, Haiku 5.5: https://www.developersdigest.tech/blog/fable-5-effort-levels-explained
- Opus 5.5 vs Opus 5 vs Fable 5.1 (The Rundown): https://app.therundown.ai/guides/claude-opus-5-5-vs-opus-5-vs-fable-5-1
- Opus 5.5 vs Fable 5.1 (Emergent): https://emergent.sh/learn/claude-fable-5-1-vs-opus-5-5
- Haiku 5.5 duyurusu: https://letsdatascience.com/news/anthropic-releases-claude-haiku-55-for-high-volume-tasks-1c6260b4
- Claude Code, Codex CLI, Gemini CLI kıyası: https://www.deployhq.com/blog/comparing-claude-code-openai-codex-and-google-gemini-cli-which-ai-coding-assistant-is-right-for-your-deployment-workflow
- Claude Code alt ajan model yönlendirme ve Tactical Model Selection: https://www.claudelog.com/mechanics/tactical-model-selection/
