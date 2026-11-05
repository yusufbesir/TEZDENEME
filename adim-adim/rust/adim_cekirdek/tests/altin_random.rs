//! Dart VM `Random(tohum)` ve `List.shuffle` çıktılarıyla birebir eşdeğerlik.
use adim_cekirdek::dart_random::DartRandom;
use serde::Deserialize;

#[derive(Deserialize)]
struct Vektor {
    tohum: i64,
    n: i64,
    karisim: Option<Vec<usize>>,
    ints: Option<Vec<u64>>,
}

#[test]
fn random_ve_shuffle_dart_ile_ayni() {
    let v: Vec<Vektor> = serde_json::from_str(include_str!("altin/random.json")).unwrap();
    assert!(v.len() >= 50);
    for x in &v {
        if let Some(k) = &x.karisim {
            let mut l: Vec<usize> = (0..x.n as usize).collect();
            DartRandom::new(x.tohum).karistir(&mut l);
            assert_eq!(&l, k, "tohum {} n {}", x.tohum, x.n);
        }
        if let Some(ints) = &x.ints {
            let mut r = DartRandom::new(x.tohum);
            let ms = [1u64, 2, 3, 5, 8, 10, 100, 1000, 65536, 1_000_000_007, 4_294_967_296];
            let got: Vec<u64> = ms.iter().map(|&m| r.next_int(m)).collect();
            assert_eq!(&got, ints, "tohum {}", x.tohum);
        }
    }
}
