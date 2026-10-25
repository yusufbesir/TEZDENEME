<!-- Sahip: Claude [İP:AgentMom Faz 11]. Karar kaydı; değişiklik yalnız ekleme. Silme kararı yalnız Yusuf'undur. -->
# ADR-014: Jev ve REA kapsam dışı; karar sağlayıcı uzantı noktası
Durum: kabul (2026-10-22, Yusuf).

## Karar
- **Jev şimdilik AgentMom'ın parçası değildir.** Kodda, arayüzde, ayarlarda ve yardım metinlerinde Jev'e özgü bir şey yoktur (referans taraması: `src/` ve `scripts/` içinde Jev yok). Kontrol listesinde madde 43 "Kapsam dışı" olarak ayrı sayılır ve Doğrulandı/Kısmi/Planlı sayımına girmez.
- **Yeni geliştirme yapılmaz.** Jev için ücretli çağrı, yerel ayna ya da yer tutucu yazılmaz.
- **REA:** mevcut Faz 6 kodu (madde 39, ADR-007) test edilmiş durumdadır ve değiştirilmez; "olduğu gibi kalsın" mı "Jev gibi çıkarılsın mı" kararı Yusuf'ta bekler.

## Sonradan ekleme sözleşmesi (kodda henüz yok, bilerek)
Jev ya da başka bir karar sağlayıcı ileride eklenirse şu kurallarla eklenir:
1. Sağlayıcı yalnız **danışmandır**: puan/öneri üretir; izin vermez, onay yerine geçmez.
2. Politika motoru deterministik kalır ve tek karar verendir; sağlayıcı yanıtı politikayı genişletemez, `deny`/`require_approval` kararını gevşetemez.
3. Sağlayıcı kapalı, erişilemez ya da yanıtsızsa akış değişmez (fail-closed: önerisiz devam, izin açılmaz).
4. Her çağrı denetim kaydına düşer; ücretli (metered) rota ve API anahtarı kuralları aynen geçerlidir.
5. Eklenirken yeni bir ADR yazılır ve politika motoru testlerine "hiçbir sağlayıcı izin veremez" testi eklenir.

Bilerek soyut arayüz yazılmadı: kullanılmayan arayüz yer tutucudur (§18). İstenirse ayrı küçük dilim olarak eklenir.

## Ek (2026-10-23): REA da kapsam dışı (Yusuf: "b")
- AgentMom'ın kendi REA motoru (Faz 6, ADR-007: `src/rea`, `/api/rea/*`, arayüz bölümleri, testler) koddan `git rm` ile çıkarılır; geçmişten geri alınabilir. Madde 39 "Kapsam dışı"dır.
- `009_rea` migrasyonu geçmiş migrasyon değişmez kuralıyla ve olası kullanıcı verisini korumak için DEĞİŞTİRİLMEZ; tablolar kullanılmaz hâlde kalır (yeni DROP migrasyonu yazılmadı).
- Bağımlı maddeler: 37 (Araştırma Merkezi) ve 38 (Özellik Keşfi) Planlı'ya döndü; 12, 66, 83 metinleri REA atfı olmadan yeniden yazıldı.
- Yusuf'un cihazındaki REA MCP aracı (ikili/APK analizi) AgentMom'dan bağımsızdır, bu karardan etkilenmez.
- ADR-007 tarihsel kayıt olarak kalır (yalnız ekleme kuralı); yeni REA, aynı sözleşme (yalnız kayıt eder, politikayı değiştiremez) ile yeni bir ADR'yle eklenir.
