# Rust çekirdek (adim_cekirdek)

Saf hesap işleri. Davranış Dart karşılığıyla birebir aynı olmalı; kanıt `tests/altin/*.json`
altın vektörleridir (Dart tarafından `tool/altin_*.dart` ile üretilir).

```
cd rust && cargo test && cargo clippy --all-targets -- -D warnings && cargo fmt --check
dart run tool/altin_normalize.dart   # çıktının ilk `[` öncesi Flutter satırlarını ayıkla
```

Plan: `docs/PLAN-RUST-PYTHON-GECIS.md`. Aşama 1 ilerlemesi: sozluk::normalize ✓, dikte::dikte_farki ✓ (kalan: kart yarı ömür, yerleştirme seçimi, karışık sıra [Dart Random(tohum) algoritması gerekir], metin_kelime).
