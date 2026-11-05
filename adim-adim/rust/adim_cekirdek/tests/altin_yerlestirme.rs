//! Dart `Motor.yerlestirmeSec` çıktılarıyla birebir eşdeğerlik.
use adim_cekirdek::yerlestirme::{yerlestirme_sec, Ders, Unite};
use serde::Deserialize;

#[derive(Deserialize)]
struct DersG {
    id: String,
    bitmis: bool,
    secilebilir: Vec<bool>,
}

#[derive(Deserialize)]
struct Senaryo {
    uniteler: Vec<Vec<DersG>>,
    tohum: i64,
    en_cok: usize,
    sonuc: Vec<(usize, String)>,
}

#[test]
fn yerlestirme_dart_ile_ayni() {
    let v: Vec<Senaryo> =
        serde_json::from_str(include_str!("altin/yerlestirme.json")).unwrap();
    assert!(v.len() >= 150);
    for (n, s) in v.iter().enumerate() {
        let uniteler: Vec<Unite> = s
            .uniteler
            .iter()
            .map(|u| Unite {
                dersler: u
                    .iter()
                    .map(|d| Ders {
                        id: d.id.clone(),
                        bitmis: d.bitmis,
                        secilebilir: d.secilebilir.clone(),
                    })
                    .collect(),
            })
            .collect();
        let rust: Vec<(usize, String)> = yerlestirme_sec(&uniteler, s.tohum, s.en_cok)
            .into_iter()
            .map(|q| (q.unite, q.kart_id))
            .collect();
        assert_eq!(rust, s.sonuc, "senaryo {} tohum {} en_cok {}", n, s.tohum, s.en_cok);
    }
}
