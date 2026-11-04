//! Sözlük arama anahtarı. Dart karşılığı: `Sozluk.normalize`.

/// Dart `String.trim` boşluk kümesi: Unicode boşlukları ve BOM (U+FEFF).
fn dart_bosluk(c: char) -> bool {
    c.is_whitespace() || c == '\u{feff}'
}

/// Arama için normalize: küçük harf, Türkçe harfler sadeleştirilir.
pub fn normalize(s: &str) -> String {
    let mut cikti = String::with_capacity(s.len());
    for ch in s.trim_matches(dart_bosluk).chars() {
        match ch {
            'İ' | 'I' | 'ı' | 'i' => cikti.push('i'),
            'Ş' | 'ş' => cikti.push('s'),
            'Ğ' | 'ğ' => cikti.push('g'),
            'Ü' | 'ü' => cikti.push('u'),
            'Ö' | 'ö' => cikti.push('o'),
            'Ç' | 'ç' => cikti.push('c'),
            _ => cikti.extend(ch.to_lowercase()),
        }
    }
    cikti
}
