//! Dart `MetinKelime.kelimeleriAyir` çıktılarıyla birebir eşdeğerlik.
use adim_cekirdek::metin_kelime::kelimeleri_ayir;
use serde::Deserialize;

#[derive(Deserialize)]
struct Vektor {
    metin: String,
    dil: String,
    sonuc: Vec<String>,
}

#[test]
fn kelimeleri_ayir_dart_ile_ayni() {
    let vektorler: Vec<Vektor> =
        serde_json::from_str(include_str!("altin/metin_kelime.json")).unwrap();
    assert!(vektorler.len() >= 25);
    let mut farklar = Vec::new();
    for v in &vektorler {
        let rust = kelimeleri_ayir(&v.metin, &v.dil);
        if rust != v.sonuc {
            let kisa: String = v.metin.chars().take(40).collect();
            farklar.push(format!(
                "{:?} ({})\n  Dart {:?}\n  Rust {:?}",
                kisa,
                v.dil,
                &v.sonuc[..v.sonuc.len().min(6)],
                &rust[..rust.len().min(6)]
            ));
        }
    }
    assert!(farklar.is_empty(), "farklar:\n{}", farklar.join("\n"));
}
