//! `MetinKelime.kelimeleriAyir` (Dart) ile birebir: metni Latin harfli tekil
//! kelimelere ayırır. Sözlük eşleme kısmı (sözlük yapıları) henüz Dart'ta kalır.
use regex::Regex;
use std::collections::HashSet;
use std::sync::OnceLock;

/// Metin üst sınırı (UTF-16 kod birimi, Dart `String.length` gibi).
pub const EN_COK_KARAKTER: usize = 5000;
/// Tekil kelime üst sınırı.
pub const EN_COK_KELIME: usize = 200;

const LATIN_DISI: [&str; 5] = ["ko", "ja", "zh", "ru", "ar"];

fn kelime_deseni() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"\p{Script=Latin}+(?:['’]\p{Script=Latin}+)*").unwrap())
}

/// Türkçe için İ→i, I→ı; sonra küçük harf. Dart `toLowerCase` U+0130'u (İ)
/// tek `i`ye çevirir (Rust tam eşleme `i̇` üretir); tek çok karakterli
/// küçültme bu olduğundan her dilde önce `i`ye çevrilir.
fn kucult(s: &str, dil: &str) -> String {
    let s = s.replace('İ', "i");
    if dil == "tr" {
        s.replace('I', "ı").to_lowercase()
    } else {
        s.to_lowercase()
    }
}

/// Dart `kelimeleriAyir(metin, dil)` ile aynı: tekrarlar tek (ilk görülme
/// sırası), Latin dışı dil kodlarında boş liste.
pub fn kelimeleri_ayir(metin: &str, dil: &str) -> Vec<String> {
    if LATIN_DISI.contains(&dil) {
        return Vec::new();
    }
    let birimler: Vec<u16> = metin.encode_utf16().collect();
    let kaynak = if birimler.len() > EN_COK_KARAKTER {
        String::from_utf16_lossy(&birimler[..EN_COK_KARAKTER])
    } else {
        metin.to_string()
    };
    let mut gorulen: HashSet<String> = HashSet::new();
    let mut sonuc = Vec::new();
    for e in kelime_deseni().find_iter(&kaynak) {
        let k = kucult(&e.as_str().replace('’', "'"), dil);
        if gorulen.insert(k.clone()) {
            sonuc.push(k);
            if sonuc.len() >= EN_COK_KELIME {
                break;
            }
        }
    }
    sonuc
}

#[cfg(test)]
mod testler {
    use super::*;

    #[test]
    fn temel() {
        assert_eq!(
            kelimeleri_ayir("Hello, hello World! don’t 123", "en"),
            vec!["hello", "world", "don't"]
        );
        assert!(kelimeleri_ayir("こんにちは", "ja").is_empty());
        assert_eq!(kelimeleri_ayir("IŞIK İzmir", "tr"), vec!["ışık", "izmir"]);
    }
}
