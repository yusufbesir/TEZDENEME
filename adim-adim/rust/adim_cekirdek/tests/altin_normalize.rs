//! Dart `Sozluk.normalize` çıktılarıyla birebir eşdeğerlik.
use adim_cekirdek::sozluk::normalize;
use serde::Deserialize;

#[derive(Deserialize)]
struct Vektor {
    girdi: String,
    cikti: String,
}

#[test]
fn normalize_dart_ile_ayni() {
    let ham = include_str!("altin/normalize.json");
    let vektorler: Vec<Vektor> = serde_json::from_str(ham).unwrap();
    assert!(vektorler.len() > 20);
    let mut farklar = Vec::new();
    for v in &vektorler {
        let sonuc = normalize(&v.girdi);
        if sonuc != v.cikti {
            farklar.push(format!(
                "{:?}: Dart {:?}, Rust {:?}",
                v.girdi, v.cikti, sonuc
            ));
        }
    }
    assert!(farklar.is_empty(), "farklar:\n{}", farklar.join("\n"));
}
