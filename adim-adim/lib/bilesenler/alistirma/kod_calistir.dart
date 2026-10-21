import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../durum/saglayicilar.dart';
import '../../model/icerik.dart';
import '../../tema/tema.dart';
import 'kod_etkilesim.dart';
import 'soru_basligi.dart';

/// Çalıştırılabilir ders (ÖZELLİK 69): kullanıcı JS kodunu düzenler,
/// "Çalıştır" ile cihazdaki motorda çalıştırır; çıktı konsolda gösterilir ve
/// cevap olarak bildirilir (kod değişince cevap sıfırlanır, yeniden
/// çalıştırmak gerekir). Motor yoksa (ör. test ortamı, kütüphane
/// yüklenemedi) dürüstçe söylenir ve alıştırma, örnek çözüm kodunun çıktısını
/// tahmin etmeye döner.
class KodCalistirGorunumu extends ConsumerStatefulWidget {
  const KodCalistirGorunumu({
    super.key,
    required this.alistirma,
    required this.kontrolEdildi,
    required this.dogruMu,
    required this.onCevap,
  });
  final KodCalistir alistirma;
  final bool kontrolEdildi;
  final bool dogruMu;
  final ValueChanged<Object?> onCevap;

  @override
  ConsumerState<KodCalistirGorunumu> createState() => _KodCalistirDurumu();
}

class _KodCalistirDurumu extends ConsumerState<KodCalistirGorunumu> {
  late final _kod = TextEditingController(text: widget.alistirma.baslangic);
  final _tahmin = TextEditingController();
  KodCalismaSonucu? _sonuc;
  bool _calisiyor = false;
  bool _motorYok = false;

  @override
  void dispose() {
    _kod.dispose();
    _tahmin.dispose();
    super.dispose();
  }

  Future<void> _calistir() async {
    if (_calisiyor || widget.kontrolEdildi) return;
    setState(() => _calisiyor = true);
    final kod = _kod.text;
    final s = await ref.read(kodCalistiriciProvider).calistir(kod);
    if (!mounted) return;
    setState(() {
      _calisiyor = false;
      _sonuc = s;
      _motorYok = s.motorYok;
    });
    widget.onCevap(s.motorYok ? null : s);
  }

  @override
  Widget build(BuildContext context) {
    final a = widget.alistirma;
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final kontrol = widget.kontrolEdildi;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SoruBasligi(
          a.soru,
          ipucu: _motorYok
              ? null
              : 'Kodu yaz, "Çalıştır"a bas; çıktı beklenenle karşılaştırılır.',
        ),
        Text('Beklenen çıktı', style: yazi.labelLarge),
        const SizedBox(height: 4),
        KodKutusu(
          key: const ValueKey('kod-beklenen'),
          metin: ciktiNormalle(a.beklenenCikti),
          semantik: 'Beklenen çıktı: ${ciktiNormalle(a.beklenenCikti)}',
        ),
        if (_motorYok)
          ..._motorsuz(a, r, yazi)
        else
          ..._motorlu(a, r, yazi, kontrol),
      ],
    );
  }

  List<Widget> _motorlu(
    KodCalistir a,
    AdimRenkleri r,
    TextTheme yazi,
    bool kontrol,
  ) {
    final s = _sonuc;
    return [
      KodYaziAlani(
        key: const ValueKey('kod-calistir-alani'),
        denetci: _kod,
        etiket: 'JavaScript kodu',
        cokSatir: true,
        kontrolEdildi: kontrol,
        dogruMu: widget.dogruMu,
        enCok: 4000,
        onDegisti: (_) {
          if (_sonuc != null) {
            setState(() => _sonuc = null);
            widget.onCevap(null);
          }
        },
      ),
      const SizedBox(height: Olcu.b1),
      Row(
        children: [
          FilledButton.tonalIcon(
            key: const ValueKey('kod-calistir'),
            icon: _calisiyor
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.play_arrow),
            label: const Text('Çalıştır'),
            onPressed: kontrol || _calisiyor ? null : _calistir,
          ),
          const SizedBox(width: Olcu.b1),
          Flexible(
            child: Text(
              'Çevrimdışı, ağ ve dosya erişimi yok; süre sınırı 2 sn.',
              style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
            ),
          ),
        ],
      ),
      if (s != null) ...[
        const SizedBox(height: Olcu.b2),
        Text('Konsol', style: yazi.labelLarge),
        const SizedBox(height: 4),
        KodKutusu(
          key: const ValueKey('kod-konsol'),
          metin: [
            if (s.cikti.isNotEmpty) s.cikti,
            if (s.hata != null) '⚠ ${s.hata}',
            if (s.cikti.isEmpty && s.hata == null) '(çıktı yok)',
          ].join('\n'),
          semantik:
              'Konsol: ${s.cikti.isEmpty ? 'çıktı yok' : s.cikti}${s.hata == null ? '' : '. Hata: ${s.hata}'}',
        ),
        if (s.basarili && !kontrol)
          Text(
            ciktiAyni(s.cikti, a.beklenenCikti)
                ? 'Çıktı beklenenle aynı. "Kontrol et"e bas.'
                : 'Çıktı beklenenden farklı; kodu düzeltip yeniden çalıştırabilirsin.',
            style: yazi.bodyMedium,
          ),
      ],
    ];
  }

  List<Widget> _motorsuz(KodCalistir a, AdimRenkleri r, TextTheme yazi) => [
    Container(
      key: const ValueKey('kod-motor-yok'),
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: Olcu.b2),
      padding: const EdgeInsets.all(Olcu.b2),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(Olcu.kose),
        border: Border.all(color: r.vurgu),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline, color: r.vurgu),
          const SizedBox(width: Olcu.b1),
          Expanded(
            child: Text(
              'Bu cihazda JavaScript motoru bulunamadı, kod çalıştırılamıyor. '
              'Aşağıdaki örnek çözümün çıktısını tahmin et.',
              style: yazi.bodyMedium,
            ),
          ),
        ],
      ),
    ),
    KodKutusu(metin: a.cozum.trim(), dil: 'js'),
    KodYaziAlani(
      key: const ValueKey('kod-tahmin-alani'),
      denetci: _tahmin,
      etiket: 'Çıktı tahmini',
      cokSatir: true,
      kontrolEdildi: widget.kontrolEdildi,
      dogruMu: widget.dogruMu,
      enCok: 1000,
      onDegisti: (v) => widget.onCevap(v.trim().isEmpty ? null : v),
    ),
  ];
}
