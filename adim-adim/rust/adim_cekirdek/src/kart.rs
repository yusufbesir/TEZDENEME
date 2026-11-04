//! Aralıklı tekrar kartı. Dart karşılığı: `Motor.kartHesapla`, `Motor.gunFarki`,
//! `Kart.kutuHesapla` ve gün işlemleri (UTC gece yarısı, yaz saati etkisi yok).

pub const EN_AZ_YARI_OMUR: f64 = 0.5;
pub const EN_COK_YARI_OMUR: f64 = 180.0;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Derece {
    Zor,
    Iyi,
    Kolay,
}

impl Derece {
    pub fn kod(self) -> &'static str {
        match self {
            Derece::Zor => "zor",
            Derece::Iyi => "iyi",
            Derece::Kolay => "kolay",
        }
    }

    pub fn carpan(self) -> f64 {
        match self {
            Derece::Zor => 1.3,
            Derece::Iyi => 2.0,
            Derece::Kolay => 3.0,
        }
    }

    pub fn koddan(kod: &str) -> Option<Derece> {
        match kod {
            "zor" => Some(Derece::Zor),
            "iyi" => Some(Derece::Iyi),
            "kolay" => Some(Derece::Kolay),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Kart {
    pub kutu: u8,
    pub sonraki: String,
    pub yari_omur_gun: f64,
    pub son_cevap: Option<bool>,
    pub son_derece: Option<&'static str>,
}

/// Yarı ömürden 1..5 gösterge kutusu.
pub fn kutu_hesapla(yari_omur: f64) -> u8 {
    if yari_omur < 2.0 {
        1
    } else if yari_omur < 4.0 {
        2
    } else if yari_omur < 8.0 {
        3
    } else if yari_omur < 16.0 {
        4
    } else {
        5
    }
}

/// 1970-01-01'den gün sayısı (proleptik Gregoryen), Howard Hinnant algoritması.
fn gun_sayisi(y: i64, a: i64, g: i64) -> i64 {
    let y = if a <= 2 { y - 1 } else { y };
    let era = y.div_euclid(400);
    let yoe = y - era * 400;
    let doy = (153 * (if a > 2 { a - 3 } else { a + 9 }) + 2) / 5 + g - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146097 + doe - 719468
}

fn tarihe(z: i64) -> (i64, i64, i64) {
    let z = z + 719468;
    let era = z.div_euclid(146097);
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let g = doy - (153 * mp + 2) / 5 + 1;
    let a = if mp < 10 { mp + 3 } else { mp - 9 };
    (if a <= 2 { y + 1 } else { y }, a, g)
}

/// 'YYYY-MM-DD' geçerli mi? (Dart `OgrenciDurumu.gunGecerli`: yıl 2000..2100,
/// gerçek takvim günü, yalnız ASCII rakam.)
pub fn gun_gecerli(s: &str) -> bool {
    gun_coz(s).is_some()
}

fn gun_coz(s: &str) -> Option<(i64, i64, i64)> {
    let b = s.as_bytes();
    if b.len() != 10 || b[4] != b'-' || b[7] != b'-' {
        return None;
    }
    let sayi = |bas: usize, son: usize| -> Option<i64> {
        let parca = &b[bas..son];
        if parca.iter().all(u8::is_ascii_digit) {
            std::str::from_utf8(parca).ok()?.parse().ok()
        } else {
            None
        }
    };
    let (y, a, g) = (sayi(0, 4)?, sayi(5, 7)?, sayi(8, 10)?);
    if !(2000..=2100).contains(&y) || !(1..=12).contains(&a) || g < 1 {
        return None;
    }
    if tarihe(gun_sayisi(y, a, g)) != (y, a, g) {
        return None;
    }
    Some((y, a, g))
}

/// [gun] gününe [n] gün ekler; geçersiz girdide [gun] aynen döner.
pub fn gun_ekle(gun: &str, n: i64) -> String {
    match gun_coz(gun) {
        None => gun.to_string(),
        Some((y, a, g)) => {
            let (y, a, g) = tarihe(gun_sayisi(y, a, g) + n);
            format!("{y:04}-{a:02}-{g:02}")
        }
    }
}

/// b - a gün sayısı; geçersiz girdide 0.
pub fn gun_farki(a: &str, b: &str) -> i64 {
    match (gun_coz(a), gun_coz(b)) {
        (Some((y1, a1, g1)), Some((y2, a2, g2))) => gun_sayisi(y2, a2, g2) - gun_sayisi(y1, a1, g1),
        _ => 0,
    }
}

/// Yarı ömür modeli: doğruda x2 (ya da derece çarpanı), yanlışta /2
/// (0,5..180 gün); sonraki tekrar yarı ömrün yuvarlanmışı kadar gün sonra (en az 1).
pub fn kart_hesapla(
    onceki_yari_omur: Option<f64>,
    dogru_mu: bool,
    bugun: &str,
    derece: Option<Derece>,
) -> Kart {
    let mevcut = onceki_yari_omur.unwrap_or(1.0);
    let d = if dogru_mu { derece } else { None };
    let ham = if dogru_mu {
        mevcut * d.map_or(2.0, Derece::carpan)
    } else {
        mevcut / 2.0
    };
    let yari_omur = ham.clamp(EN_AZ_YARI_OMUR, EN_COK_YARI_OMUR);
    let aralik = (yari_omur.round() as i64).max(1);
    Kart {
        kutu: kutu_hesapla(yari_omur),
        sonraki: gun_ekle(bugun, aralik),
        yari_omur_gun: yari_omur,
        son_cevap: Some(dogru_mu),
        son_derece: d.map(Derece::kod),
    }
}
