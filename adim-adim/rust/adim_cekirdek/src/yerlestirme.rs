//! `Motor.yerlestirmeSec` (seviye belirleme sınavı soru seçimi) çevirisi.
//! Model sade tutulur: arayüz tarafı alıştırmayı `secilebilir` (Soyle ve
//! KodCalistir değil) olarak işaretleyip gönderir.

use crate::dart_random::DartRandom;

pub const EN_COK: usize = 20;
pub const UNITE_EN_AZ: usize = 3;
pub const UNITE_EN_COK: usize = 5;

pub struct Ders {
    pub id: String,
    pub bitmis: bool,
    /// Her alıştırma için: sınavda seçilebilir mi?
    pub secilebilir: Vec<bool>,
}

pub struct Unite {
    pub dersler: Vec<Ders>,
}

#[derive(Debug, PartialEq, Eq)]
pub struct Soru {
    pub unite: usize,
    pub kart_id: String,
    pub alistirma: usize,
}

fn unite_sorulari(unite: &Unite, ui: usize, adet: usize, tohum: i64) -> Vec<Soru> {
    let mut kuyruklar: Vec<std::collections::VecDeque<Soru>> = unite
        .dersler
        .iter()
        .filter(|d| !d.bitmis)
        .map(|d| {
            let mut k: Vec<Soru> = d
                .secilebilir
                .iter()
                .enumerate()
                .filter(|(_, s)| **s)
                .map(|(i, _)| Soru { unite: ui, kart_id: format!("{}#{}", d.id, i), alistirma: i })
                .collect();
            DartRandom::new(tohum + ui as i64).karistir(&mut k);
            k.into()
        })
        .collect();
    let mut sonuc = Vec::new();
    while sonuc.len() < adet && kuyruklar.iter().any(|k| !k.is_empty()) {
        for k in kuyruklar.iter_mut() {
            if sonuc.len() >= adet {
                break;
            }
            if let Some(s) = k.pop_front() {
                sonuc.push(s);
            }
        }
    }
    sonuc
}

pub fn yerlestirme_sec(uniteler: &[Unite], tohum: i64, en_cok: usize) -> Vec<Soru> {
    let acik: Vec<usize> = uniteler
        .iter()
        .enumerate()
        .filter(|(_, u)| u.dersler.iter().any(|d| !d.bitmis))
        .map(|(i, _)| i)
        .collect();
    let kullanilan: Vec<usize> = acik.into_iter().take(en_cok / UNITE_EN_AZ).collect();
    if kullanilan.is_empty() {
        return Vec::new();
    }
    let adet = (en_cok / kullanilan.len()).clamp(UNITE_EN_AZ, UNITE_EN_COK);
    let mut sonuc = Vec::new();
    for ui in kullanilan {
        sonuc.extend(unite_sorulari(&uniteler[ui], ui, adet, tohum));
    }
    sonuc
}
