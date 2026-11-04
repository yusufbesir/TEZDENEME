//! Dart `Motor.dikteFarki` çıktılarıyla birebir eşdeğerlik.
use adim_cekirdek::dikte::dikte_farki;
use serde::Deserialize;

#[derive(Deserialize)]
struct Vektor {
    dogru: String,
    verilen: String,
    sonuc: Vec<(String, String)>,
}

#[test]
fn dikte_farki_dart_ile_ayni() {
    let vektorler: Vec<Vektor> = serde_json::from_str(include_str!("altin/dikte.json")).unwrap();
    assert!(vektorler.len() >= 25);
    let mut farklar = Vec::new();
    for v in &vektorler {
        let rust: Vec<(String, String)> = dikte_farki(&v.dogru, &v.verilen)
            .into_iter()
            .map(|k| (k.kelime, k.durum.ad().to_string()))
            .collect();
        if rust != v.sonuc {
            farklar.push(format!(
                "{:?} / {:?}\n  Dart {:?}\n  Rust {:?}",
                v.dogru, v.verilen, v.sonuc, rust
            ));
        }
    }
    assert!(farklar.is_empty(), "farklar:\n{}", farklar.join("\n"));
}
