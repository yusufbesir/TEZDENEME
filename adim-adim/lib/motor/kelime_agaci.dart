/// Kelime ağacı: öğrenilen kelimeler konuya (ünite) göre dallanır. Her dal
/// bir ünitedir; dalın aşaması, o ünitedeki kelimelerin ne kadarının
/// öğrenildiğine göre büyür (tohum, filiz, fidan, ağaç, meyveli ağaç).
/// Türetilir, saklanmaz; "öğrenilmiş" ölçütü kelime bulutuyla aynıdır (bitmiş
/// ders ya da kartı olan kelime). Yalnız dil kursları. Kart aralıklarına
/// dokunmaz.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/durum.dart';
import '../model/icerik.dart';
import 'ders_ogeleri.dart';
import 'kelime_bulutu.dart';

/// Bir dalın büyüme aşaması.
enum DalAsamasi {
  tohum('Tohum', '🌰'),
  filiz('Filiz', '🌱'),
  fidan('Fidan', '🌿'),
  agac('Ağaç', '🌳'),
  meyveli('Meyveli ağaç', '🍎');

  const DalAsamasi(this.etiket, this.simge);
  final String etiket;
  final String simge;
}

/// Ağacın bir dalı: bir ünite ve içindeki kelimeler.
class AgacDali {
  const AgacDali({
    required this.uniteId,
    required this.kursAdi,
    required this.uniteAdi,
    required this.toplam,
    required this.ogrenilen,
  });

  final String uniteId;
  final String kursAdi;
  final String uniteAdi;

  /// Ünitedeki (tekrarsız, geçerli) kelime sayısı.
  final int toplam;

  /// Öğrenilmiş kelimeler (güçlüden zayıfa).
  final List<BulutKelimesi> ogrenilen;

  double get oran => toplam == 0 ? 0 : ogrenilen.length / toplam;

  DalAsamasi get asama {
    if (ogrenilen.isEmpty) return DalAsamasi.tohum;
    if (toplam > 0 && ogrenilen.length >= toplam) return DalAsamasi.meyveli;
    final o = oran;
    if (o < 0.34) return DalAsamasi.filiz;
    if (o < 0.67) return DalAsamasi.fidan;
    return DalAsamasi.agac;
  }
}

abstract final class KelimeAgaci {
  static final RegExp _parantez = RegExp(r'\s*\([^)]*\)\s*$');

  /// Dil kurslarının üniteleri için dallar (kurs ve ünite sırasıyla). Hiç
  /// kelimesi olmayan ünite dala dönüşmez.
  static List<AgacDali> uret(OgrenciDurumu d, List<Kurs> kurslar) {
    final dallar = <AgacDali>[];
    for (final kurs in kurslar) {
      if (kurs.alan != KursAlani.dil) continue;
      for (final unite in kurs.uniteler) {
        final gorulen = <String>{};
        final ogrenilen = <BulutKelimesi>[];
        for (final ders in unite.dersler) {
          final bitti = (d.tamamlanan[ders.id] ?? 0) > 0;
          final oge = DersOgeleri.uret(ders, alan: kurs.alan);
          for (final o in oge.tureGore(OgeTuru.kelime)) {
            final anlam = o.anlam;
            if (anlam == null || anlam.isEmpty) continue;
            if (anlam.length > 40 || anlam.contains('?')) continue;
            final metin = o.metin.replaceAll(_parantez, '').trim();
            if (metin.isEmpty || metin.split(RegExp(r'\s+')).length > 3) {
              continue;
            }
            if (!gorulen.add(metin.toLowerCase())) continue;
            final kart = d.kartlar[o.kartId];
            if (!bitti && kart == null) continue;
            ogrenilen.add(
              BulutKelimesi(
                metin: metin,
                anlam: anlam,
                guc: kart == null
                    ? 0.0
                    : KelimeBulutu.gucHesapla(kart.yariOmurGun),
                kume: KelimeBulutu.kume(kart),
              ),
            );
          }
        }
        if (gorulen.isEmpty) continue;
        ogrenilen.sort((a, b) {
          final c = b.guc.compareTo(a.guc);
          return c != 0
              ? c
              : a.metin.toLowerCase().compareTo(b.metin.toLowerCase());
        });
        dallar.add(
          AgacDali(
            uniteId: unite.id,
            kursAdi: kurs.ad,
            uniteAdi: unite.ad,
            toplam: gorulen.length,
            ogrenilen: List.unmodifiable(ogrenilen),
          ),
        );
      }
    }
    return List.unmodifiable(dallar);
  }
}
