/// Dilbilgisi ipucu ekranı (Pratik merkezi, yalnız dil alanı): alanın
/// kurslarındaki sabit dilbilgisi ipuçlarını tek tek gösterir. Açılışta
/// öğrencinin ilk tamamlanmamış dersinin ipucu seçilir; "Önceki/Sonraki" ile
/// gezilir; "İlgili alıştırmaya git" bağlı dersi açar (`/ders/<id>`).
/// Durum değiştirmez (kart aralığı, XP, hata defteri aynen kalır).
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// yazan: [Claude#dalga3]
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/dilbilgisi_ipucu_karti.dart';
import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/dilbilgisi_ipucu.dart';
import '../model/durum.dart';
import '../motor/dilbilgisi_ipucu.dart';
import '../tema/tema.dart';

class DilbilgisiIpucuEkrani extends ConsumerStatefulWidget {
  const DilbilgisiIpucuEkrani({super.key});

  @override
  ConsumerState<DilbilgisiIpucuEkrani> createState() => _IpucuDurumu();
}

class _IpucuDurumu extends ConsumerState<DilbilgisiIpucuEkrani> {
  late final List<DilbilgisiIpucu> _liste;
  late int _indeks;

  @override
  void initState() {
    super.initState();
    final alan = ref.read(durumProvider).value?.alan;
    // Yalnız dil kurslarında ipucu vardır.
    _liste = alan == 'dil'
        ? DilbilgisiIpuclari.kurslarIcin(ref.read(alanKurslariProvider))
        : const [];
    final d = ref.read(durumProvider).value ?? const OgrenciDurumu();
    _indeks = DilbilgisiIpuclari.baslangicIndeksi(d, _liste);
  }

  String? _dersAdi(DilbilgisiIpucu i) {
    for (final k in ref.read(alanKurslariProvider)) {
      final ders = k.dersBul(i.dersId);
      if (ders != null) return ders.ad;
    }
    return null;
  }

  void _git(int n) => setState(() {
    _indeks = (_indeks + n).clamp(0, _liste.length - 1);
  });

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    Widget govde;
    if (_liste.isEmpty) {
      govde = Center(
        child: Padding(
          padding: const EdgeInsets.all(Olcu.b3),
          child: Text(
            'Bu kurs için henüz dilbilgisi ipucu yok.',
            key: const ValueKey('ipucu-bos'),
            style: yazi.bodyLarge,
            textAlign: TextAlign.center,
          ),
        ),
      );
    } else {
      final ipucu = _liste[_indeks];
      govde = SingleChildScrollView(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              '${_indeks + 1} / ${_liste.length}',
              key: const ValueKey('ipucu-sayac'),
              style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: Olcu.b1),
            DilbilgisiIpucuKarti(
              ipucu: ipucu,
              dersAdi: _dersAdi(ipucu),
              onGit: () => context.push('/ders/${ipucu.dersId}'),
            ),
            const SizedBox(height: Olcu.b2),
            Wrap(
              spacing: Olcu.b2,
              runSpacing: Olcu.b1,
              alignment: WrapAlignment.center,
              children: [
                OutlinedButton(
                  key: const ValueKey('ipucu-onceki'),
                  onPressed: _indeks > 0 ? () => _git(-1) : null,
                  child: const Text('Önceki'),
                ),
                FilledButton(
                  key: const ValueKey('ipucu-sonraki'),
                  onPressed: _indeks < _liste.length - 1 ? () => _git(1) : null,
                  child: const Text('Sonraki'),
                ),
              ],
            ),
          ],
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dilbilgisi ipucu'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/pratik'),
        ),
      ),
      body: SafeArea(child: SayfaGovdesi(child: govde)),
    );
  }
}
