//! Dart `Motor.kartHesapla` ve gün işlemleriyle birebir eşdeğerlik.
use adim_cekirdek::kart::{gun_farki, kart_hesapla, Derece};
use serde::Deserialize;

#[derive(Deserialize)]
struct KartV {
    onceki: Option<f64>,
    dogru: bool,
    derece: Option<String>,
    bugun: String,
    kutu: u8,
    sonraki: String,
    #[serde(rename = "yariOmur")]
    yari_omur: f64,
    #[serde(rename = "sonCevap")]
    son_cevap: Option<bool>,
    #[serde(rename = "sonDerece")]
    son_derece: Option<String>,
}

#[derive(Deserialize)]
struct FarkV {
    a: String,
    b: String,
    fark: i64,
}

#[derive(Deserialize)]
struct Dosya {
    kartlar: Vec<KartV>,
    farklar: Vec<FarkV>,
}

#[test]
fn kart_hesapla_dart_ile_ayni() {
    let d: Dosya = serde_json::from_str(include_str!("altin/kart.json")).unwrap();
    assert_eq!(d.kartlar.len(), 400);
    let mut farklar = Vec::new();
    for v in &d.kartlar {
        let derece = v.derece.as_deref().and_then(Derece::koddan);
        let k = kart_hesapla(v.onceki, v.dogru, &v.bugun, derece);
        let ayni = k.kutu == v.kutu
            && k.sonraki == v.sonraki
            && k.yari_omur_gun == v.yari_omur
            && k.son_cevap == v.son_cevap
            && k.son_derece.map(str::to_string) == v.son_derece;
        if !ayni {
            farklar.push(format!(
                "onceki {:?} dogru {} derece {:?} bugun {}: Dart kutu {} {} {} {:?} {:?}, Rust {:?}",
                v.onceki, v.dogru, v.derece, v.bugun, v.kutu, v.sonraki, v.yari_omur,
                v.son_cevap, v.son_derece, k
            ));
        }
    }
    assert!(farklar.is_empty(), "farklar:\n{}", farklar.join("\n"));
}

#[test]
fn gun_farki_dart_ile_ayni() {
    let d: Dosya = serde_json::from_str(include_str!("altin/kart.json")).unwrap();
    for f in &d.farklar {
        assert_eq!(gun_farki(&f.a, &f.b), f.fark, "{} -> {}", f.a, f.b);
    }
}
