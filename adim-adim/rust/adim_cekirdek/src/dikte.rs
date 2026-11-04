//! Dikte farkı. Dart karşılığı: `Motor.dikteFarki` (kelime düzeyinde LCS).

use unicode_properties::{GeneralCategoryGroup, UnicodeGeneralCategory};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Durum {
    Dogru,
    Eksik,
    Fazla,
}

impl Durum {
    pub fn ad(self) -> &'static str {
        match self {
            Durum::Dogru => "dogru",
            Durum::Eksik => "eksik",
            Durum::Fazla => "fazla",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Kelime {
    pub kelime: String,
    pub durum: Durum,
}

/// Dart `RegExp(r'\s')`: Unicode boşlukları ve U+FEFF; U+0085 hariç.
fn dart_s(c: char) -> bool {
    (c.is_whitespace() && c != '\u{85}') || c == '\u{feff}'
}

/// Dart `String.trim` kümesi: Unicode boşlukları ve U+FEFF (U+0085 dahil).
fn dart_trim_bosluk(c: char) -> bool {
    c.is_whitespace() || c == '\u{feff}'
}

/// Dart `_normalle`: kıvrık tırnaklar düzleşir, İ/I/ı→i, küçük harf,
/// boşluk dizileri tek boşluk, sondaki . ! ? ve boşluklar atılır.
fn normalle(s: &str) -> String {
    let mut ara = String::with_capacity(s.len());
    for ch in s.chars() {
        match ch {
            '\u{2018}' | '\u{2019}' | '\u{02BC}' | '\u{00B4}' | '`' => ara.push('\''),
            '\u{201C}' | '\u{201D}' => ara.push('"'),
            'İ' | 'I' | 'ı' => ara.push('i'),
            _ => ara.extend(ch.to_lowercase()),
        }
    }
    let mut tek = String::with_capacity(ara.len());
    let mut onceki_bosluk = false;
    for ch in ara.chars() {
        if dart_s(ch) {
            if !onceki_bosluk {
                tek.push(' ');
            }
            onceki_bosluk = true;
        } else {
            tek.push(ch);
            onceki_bosluk = false;
        }
    }
    let kirpik = tek.trim_matches(dart_trim_bosluk);
    kirpik
        .trim_end_matches(|c: char| matches!(c, '.' | '!' | '?') || dart_s(c))
        .to_string()
}

fn harf_ya_da_sayi(c: char) -> bool {
    matches!(
        c.general_category_group(),
        GeneralCategoryGroup::Letter | GeneralCategoryGroup::Number
    )
}

/// Dart `_dikteKelime`: `normalle` + baştaki/sondaki noktalama atılır.
fn dikte_kelime(k: &str) -> String {
    normalle(k)
        .trim_matches(|c: char| !harf_ya_da_sayi(c))
        .to_string()
}

fn kelimeler(s: &str) -> Vec<&str> {
    s.trim_matches(dart_trim_bosluk)
        .split(dart_s)
        .filter(|k| !k.is_empty())
        .collect()
}

pub fn dikte_farki(dogru: &str, verilen: &str) -> Vec<Kelime> {
    let d = kelimeler(dogru);
    let v = kelimeler(verilen);
    let dn: Vec<String> = d.iter().map(|k| dikte_kelime(k)).collect();
    let vn: Vec<String> = v.iter().map(|k| dikte_kelime(k)).collect();
    let mut t = vec![vec![0usize; v.len() + 1]; d.len() + 1];
    for i in (0..d.len()).rev() {
        for j in (0..v.len()).rev() {
            t[i][j] = if dn[i] == vn[j] {
                t[i + 1][j + 1] + 1
            } else {
                t[i + 1][j].max(t[i][j + 1])
            };
        }
    }
    let mut sonuc = Vec::new();
    let (mut i, mut j) = (0, 0);
    while i < d.len() && j < v.len() {
        if dn[i] == vn[j] {
            sonuc.push(Kelime {
                kelime: d[i].to_string(),
                durum: Durum::Dogru,
            });
            i += 1;
            j += 1;
        } else if t[i + 1][j] >= t[i][j + 1] {
            sonuc.push(Kelime {
                kelime: d[i].to_string(),
                durum: Durum::Eksik,
            });
            i += 1;
        } else {
            sonuc.push(Kelime {
                kelime: v[j].to_string(),
                durum: Durum::Fazla,
            });
            j += 1;
        }
    }
    for k in &d[i..] {
        sonuc.push(Kelime {
            kelime: k.to_string(),
            durum: Durum::Eksik,
        });
    }
    for k in &v[j..] {
        sonuc.push(Kelime {
            kelime: k.to_string(),
            durum: Durum::Fazla,
        });
    }
    sonuc
}
