# ajan-paneli

Claude Code için bir mod. Sağdaki **Ajanlar** panelinde orchestrator yapısının dört ajanını piksel art kartlarla gösterir:

| Ajan | Renk | Varsayılan model |
| --- | --- | --- |
| Beyin (ana oturum) | mor | claude-opus-5-5 |
| scout | yeşil | claude-haiku-5-5 |
| implementer | turuncu | claude-sonnet-5-5 |
| verifier | mavi | claude-sonnet-5-5 |

Kartın altında ajanın adı ve modeli yazar; model, ajan gerçekten çalıştığında motorun bildirdiği değerle güncellenir. Ajan çalışırken karakterin üstünde o an ne yaptığını anlatan kısa Türkçe bir balon çıkar ("index.ts okunuyor", "Testler çalışıyor", "scout ajanına görev veriyor" gibi).

Durumlar: **Beklemede**, **Çalışıyor**, **Bitti**, **Hata**.

## Gereksinim

Claude Code v2.1.287 veya üstü (2.1.296 ile geliştirildi ve test edildi).

## Yükleme

```sh
claude --plugin-dir ./mods/ajan-paneli
```

## Komutlar

- `/ajanlar`: paneli açar (terminal dar olduğu için panel kendiliğinden açılmazsa).
- `/rapor`: her ajan için çağrı sayısı, toplam süre, token, görevler ve dosyalar; verifier için Geçti/Kaldı sayısı.
- `/rapor temizle`: rapor kaydını sıfırlar.

Rapor oturumlar arasında saklanır.

## Nasıl çalışır

- Beyin, ana oturumun turlarıdır (`turn.start` / `turn.complete`).
- scout, implementer ve verifier, `Agent` aracıyla başlatılan alt ajanlardır (`agent.spawn`); alt ajan türü `scout`, `implementer`, `verifier` ya da `<önek>:scout` gibi bir adsa eşlenir.
- Balonlar her ajanın araç çağrılarından (`tool.call`) üretilir.
- Verifier'ın cevabında ilk geçen "Geçti" ya da "Kaldı" kelimesi sonucu belirler.

## Geliştirme

```sh
claude plugin validate ./mods/ajan-paneli
claude plugin test ./mods/ajan-paneli
```
