---
name: is-kaydi
description: Bir iş bittiğinde commit, PR, orkestratör günlüğü ve CHECKPOINT kaydını kurallara uygun biçimde yazmak için kullan.
---

# İş kaydı (commit, PR, günlük, CHECKPOINT)

Kaynak kurallar: `docs/kurallar/orkestrasyon-ve-kayit.md`, `CLAUDE.md` Orchestrator Kuralları. [İP:Talimat düzeni#zkd4TM]

## Sıra
1. Kod değiştiyse `verifier` Geçti demeden commit'leme.
2. Commit mesajının başına oturum etiketini koy: `[İP:<başlık>#<cse_ son 6>]`. Mesaj sonuna ortamın istediği atıf satırlarını ekle.
3. PR açıklamasında etiket, "Birlikte çalışılanlar" (alt ajanlar ve model, ilgili iş parçacıkları) ve token bilgisi olsun. Repo PR şablonu varsa onu kullan.
4. `docs/orchestrator-log.md` sonuna tek satır ekle: tarih, görev, ajan/model, token, sonuç. Mevcut satırları silme; dosyada önce okuyup biçime uy.
5. `CHECKPOINT.md`: biten işi "Tamamlandı"ya taşı (silme), sıradaki adımı ve bekleyen kararları güncelle.
6. Uzun işte ilerlemeyi (yapılan adımlar, sıradaki adım) durum listesine yaz; kesintiden sonra sormadan kaldığın yerden devam et (bekleyen onaylar hariç).

## Notlar
- Alt ajan kullanılmadıysa "Alt ajan kullanılmadı" yaz; uydurma ajan yazma.
- Kesin token alınamıyorsa "tahmini" yaz.
- Geri alınabilirlik için ne nerede değişti, kayıtta açık olsun.
