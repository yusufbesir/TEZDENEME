# Rust çekirdek (adim_cekirdek)

Saf hesap işleri. Davranış Dart karşılığıyla birebir aynı olmalı; kanıt `tests/altin/*.json`
altın vektörleridir (Dart tarafından `tool/altin_*.dart` ile üretilir).

```
cd rust && cargo test && cargo clippy --all-targets -- -D warnings && cargo fmt --check
dart run tool/altin_normalize.dart   # çıktının ilk `[` öncesi Flutter satırlarını ayıkla
```

Plan: `docs/PLAN-RUST-PYTHON-GECIS.md`. Aşama 1 ilerlemesi: sozluk::normalize ✓, dikte::dikte_farki ✓, kart::kart_hesapla + gün işlemleri ✓, metin_kelime::kelimeleri_ayir ✓ (30 vektör; sözlük eşleme Dart'ta kalır). yerleştirme seçimi ✓ (180 senaryo). Dart Random + shuffle birebir port edildi (random.rs altın vektör).
