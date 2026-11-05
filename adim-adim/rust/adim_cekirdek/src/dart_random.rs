//! Dart VM `Random(tohum)` (çarp-taşı, MWC) ve `List.shuffle` birebir portu.
//! Kaynak: dart-sdk `_internal/vm/lib/math_patch.dart`. Yalnız VM (Android/iOS/test)
//! için geçerlidir; web derlemesi farklı üretir.

pub struct DartRandom {
    state: u64,
}

impl DartRandom {
    fn setup_seed(seed: i64) -> u64 {
        let mut n = seed as u64;
        n = (!n).wrapping_add(n << 21);
        n ^= n >> 24;
        n = n.wrapping_mul(265);
        n ^= n >> 14;
        n = n.wrapping_mul(21);
        n ^= n >> 28;
        n = n.wrapping_add(n << 31);
        if n == 0 {
            n = 0x5a17;
        }
        n
    }

    pub fn new(seed: i64) -> Self {
        let mut r = DartRandom { state: Self::setup_seed(seed) };
        for _ in 0..4 {
            r.next_state();
        }
        r
    }

    fn next_state(&mut self) {
        const A: u64 = 0xffff_da61;
        let lo = self.state & 0xFFFF_FFFF;
        let hi = self.state >> 32;
        self.state = A.wrapping_mul(lo).wrapping_add(hi);
    }

    /// `max` 1..=2^32 aralığında olmalıdır (aksi halde Dart RangeError atar).
    pub fn next_int(&mut self, max: u64) -> u64 {
        assert!(max >= 1 && max <= 1 << 32, "max aralık dışı");
        if max & max.wrapping_neg() == max {
            self.next_state();
            return self.state & 0xFFFF_FFFF & (max - 1);
        }
        loop {
            self.next_state();
            let rnd32 = self.state & 0xFFFF_FFFF;
            let result = rnd32 % max;
            if rnd32 - result + max <= 1 << 32 {
                return result;
            }
        }
    }

    /// Dart `List.shuffle(random)` ile aynı karıştırma.
    pub fn karistir<T>(&mut self, liste: &mut [T]) {
        let mut uzunluk = liste.len();
        while uzunluk > 1 {
            let pos = self.next_int(uzunluk as u64) as usize;
            uzunluk -= 1;
            liste.swap(uzunluk, pos);
        }
    }
}
