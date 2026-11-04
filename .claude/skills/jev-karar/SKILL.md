---
name: jev-karar
description: ŞİMDİLİK KAPALI (Yusuf, 2026-10-25): Jev yalnızca hafızadaki notları puanlar. Yeniden açılırsa, bir karar aşamasında (yöntem, mimari, varsayılan seçimi, öneri) seçenekler arasında Jev'e danışmak ve Jev'in seçimini bağımsız kontrolle doğrulamak için kullan. Denetim işlerinde kullanılmaz.
---

# Jev ile karar (danışman + bağımsız kontrol)

Jev önerir, Claude karar verir. Jev'in "genelde doğru" seçmesi her seferinde doğru seçtiği anlamına gelmez; bu yüzden her danışma kör seçim, sıra değiştirme denetimi ve gerektiğinde bağımsız hakemle doğrulanır, hepsi deftere yazılır.

## Ne zaman
- Birden fazla makul seçenek varken: yöntem, kütüphane, mimari, varsayılan değer, öneri.
- Kullanma: denetim işleri (Baş Denetmen ve yardımcıları), sayma/aritmetik/tarih karşılaştırması (kodla yap), tek doğru cevabı olan olgusal sorular, gizli bilgi içeren konular.

## Adımlar
1. Seçenekleri yaz (2-6 adet, kısa id + bir cümle açıklama). Gizli bilgi (anahtar, parola) koyma.
2. **Önce kendi seçimini yap** ve gerekçesini yaz (`claude_secimi`, `claude_gerekce`). Jev'in cevabını görmeden; bu kör seçim kayda geçer.
3. Kategoriyi seç: `normal`, `mimari`, `guvenlik`, `veri_butunlugu`, `geri_alinamaz`.
4. Danış:
   ```bash
   python3 -m jev danis --girdi karar.json
   ```
   `karar.json` örneği:
   ```json
   {"soru": "Yerel önbellek için hangi depolama?",
    "baglam": "Tek kullanıcılı masaüstü uygulaması, 10 MB veri.",
    "secenekler": [{"id": "A", "aciklama": "SQLite"}, {"id": "B", "aciklama": "JSON dosyası"}],
    "claude_secimi": "A", "claude_gerekce": "Eşzamanlı yazmaya dayanıklı.",
    "kategori": "normal", "etiket": "[İP:<başlık>#<son 6>]"}
   ```
5. Çıktıdaki `eylem`e göre ilerle:
   - `uygula`: `secilen` ile devam et. `notlar`da "zayıf onay" varsa kullanıcıya kısa not düş.
   - `bagimsiz_kontrol`: `hakem_istemi` metnini **farklı modelde** bir ajana ver (ör. `verifier`, claude-sonnet-5-5). Hakeme senin ve Jev'in seçimini söyleme. Sonra:
     ```bash
     python3 -m jev sonuclandir --karar <id> --hakem <seçenek> --hakem-model claude-sonnet-5-5 --hakem-gerekce "..."
     ```
     Çoğunluk (2/3) varsa `uygula`, yoksa `kullaniciya_sor`. Kritik kategoride çoğunluk olsa da `kullanici_onayi` döner; çoğunluğun seçimi `oneri` alanındadır.
   - `kullaniciya_sor` / `kullanici_onayi`: Kullanıcıya tek soru sor; seçenekleri, senin seçimini, Jev'in seçimini ve olasılığını göster, önerini işaretle.
     - Kritik kategoride (mimari, güvenlik, veri bütünlüğü, geri alınamaz) cevap araca yazılmaz; karar kullanıcının sohbetteki açık onayıdır, onunla ilerle.
     - Normal kategoride cevabı, kullanıcının onay mesajının kimliğiyle kaydet:
       ```bash
       python3 -m jev sonuclandir --karar <id> --kullanici <seçenek> --onay-mesaji cmsg_<kimlik>
       ```
       `--kullanici` yalnız kullanıcı sohbette açıkça seçtikten sonra yazılır; kendi seçimini kullanıcı kararı diye kaydetme. Kayıt onayın kanıtı değildir (`dogrulanmamis`); `--onay-mesaji` yoksa ya da biçimi bozuksa araç reddeder.
   - `claude_karari` (Jev'e erişilemedi): kendi seçiminle devam et ve yanıtta **"Jev'e erişilemedi"** diye açıkça yaz.
6. Sonradan hangi seçeneğin gerçekten doğru olduğu anlaşılırsa: `python3 -m jev sonuc --karar <id> --dogru <seçenek>`. Bu, Jev'in kalibrasyonunu ölçer.

## Kurallar
- Jev puanı kullanıcı onayı değildir. Kritik kategorilerde (mimari, güvenlik, veri bütünlüğü, geri alınamaz) son söz kullanıcı ve Opus'tadır.
- Jev zaman aşımına uğrarsa bu "kanıt yok" değildir; `degraded` olarak raporla.
- Hook içinde Jev çağırma.
- `python3 -m jev durum` hangi yolun (cihaz/bulut) açık olduğunu gösterir; anahtar değerini asla yazdırma, sohbete ya da notlara yazma.
- `python3 -m jev rapor` Jev'in uyum, kararlılık ve doğruluk oranlarını verir; Baş Denetmen bunu düzenli okur.
