/// Dinle ve yaz ekranı (Pratik merkezi, yalnız dil alanı): flutter_tts ile
/// okunan kelimeyi dinleyip yaz. Ses çalışmıyorsa (TTS yok ya da hata) ekran
/// metin ipucuna döner: kelimenin Türkçe anlamı, harf sayısı ve ilk harfi
/// gösterilir; böylece alıştırma sessiz de yapılabilir. "İpucu" düğmesi
/// kademelidir (anlam, sonra harf sayısı ve ilk harf). Cevap kontrolü
/// [DinleYaz.kontrol] ile yapılır. Durum değiştirmez: SRS, XP ve hata defteri
/// aynen kalır, ceza yoktur.
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// yazan: [Claude#dalga3]
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../motor/dinle_yaz.dart';
import '../tema/tema.dart';

class DinleYazEkrani extends ConsumerStatefulWidget {
  const DinleYazEkrani({super.key, this.tohum});

  /// Deste karışımı için tohum (testte sabitlenir); null: zamana bağlı.
  final int? tohum;

  @override
  ConsumerState<DinleYazEkrani> createState() => _DinleYazDurumu();
}

class _DinleYazDurumu extends ConsumerState<DinleYazEkrani> {
  late List<DinleYazKarti> _deste;
  final TextEditingController _giris = TextEditingController();
  int _indeks = 0;
  int _dogru = 0;
  int _tur = 0;
  int _ipucuDuzeyi = 0;

  /// Ses çalınamadıysa true: ekran metin ipucuna döner.
  bool _sesYok = false;

  /// Kontrol edilmişse sonuç; değilse null.
  DinleYazSonucu? _sonuc;

  @override
  void initState() {
    super.initState();
    _deste = _destele();
    _sonrakiOku();
  }

  @override
  void dispose() {
    _giris.dispose();
    super.dispose();
  }

  List<DinleYazKarti> _destele() {
    final alan = ref.read(durumProvider).value?.alan;
    if (alan != 'dil') return const [];
    return DinleYaz.deste(
      ref.read(durumProvider).value ?? const OgrenciDurumu(),
      ref.read(alanKurslariProvider),
      tohum: (widget.tohum ?? DateTime.now().microsecondsSinceEpoch) + _tur,
    );
  }

  bool get _bitti => _deste.isNotEmpty && _indeks >= _deste.length;

  /// Yeni kelime görününce bir kez okur (kare çizildikten sonra).
  void _sonrakiOku() {
    if (_deste.isEmpty) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && !_bitti) _oku();
    });
  }

  Future<void> _oku() async {
    if (_deste.isEmpty || _bitti) return;
    final k = _deste[_indeks];
    final tamam = await ref.read(sesProvider).oku(k.metin, dil: k.sesDili);
    if (!mounted) return;
    if (!tamam && !_sesYok) {
      setState(() {
        _sesYok = true;
        if (_ipucuDuzeyi < 2) _ipucuDuzeyi = 2;
      });
    }
  }

  void _kontrol() {
    if (_sonuc != null || _bitti) return;
    final k = _deste[_indeks];
    final s = DinleYaz.kontrol(_giris.text, k.metin);
    setState(() {
      _sonuc = s;
      if (s != DinleYazSonucu.yanlis) _dogru++;
    });
  }

  void _ipucu() => setState(() {
    if (_ipucuDuzeyi < 2) _ipucuDuzeyi++;
  });

  void _ilerle() {
    setState(() {
      _indeks++;
      _sonuc = null;
      _giris.clear();
      // Ses çalışmıyorsa sonraki kelimede de ipucu açık kalır.
      _ipucuDuzeyi = _sesYok ? 2 : 0;
    });
    _sonrakiOku();
  }

  void _yeniden() {
    setState(() {
      _tur++;
      _deste = _destele();
      _indeks = 0;
      _dogru = 0;
      _sonuc = null;
      _giris.clear();
      _ipucuDuzeyi = _sesYok ? 2 : 0;
    });
    _sonrakiOku();
  }

  void _cik() => context.canPop() ? context.pop() : context.go('/pratik');

  Widget _iskele(Widget govde) => Scaffold(
    appBar: AppBar(
      title: const Text('Dinle ve yaz'),
      leading: IconButton(
        icon: const Icon(Icons.arrow_back),
        tooltip: 'Geri',
        onPressed: _cik,
      ),
    ),
    body: SafeArea(child: SayfaGovdesi(child: govde)),
  );

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    if (_deste.isEmpty) {
      return _iskele(
        Center(
          child: Padding(
            padding: const EdgeInsets.all(Olcu.b3),
            child: Text(
              'Önce birkaç ders çöz; yazabileceğin kelimeler burada toplanır.',
              key: const ValueKey('dy-bos'),
              style: yazi.bodyLarge,
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
    }
    if (_bitti) {
      return _iskele(
        SingleChildScrollView(
          padding: const EdgeInsets.all(Olcu.b3),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Icon(Icons.hearing, size: 64, color: r.ana),
              const SizedBox(height: Olcu.b2),
              Semantics(
                header: true,
                child: Text(
                  'Oturum bitti',
                  style: yazi.titleLarge,
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: Olcu.b2),
              Text(
                'Doğru: $_dogru / ${_deste.length}',
                key: const ValueKey('dy-skor'),
                style: yazi.headlineSmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: Olcu.b3),
              FilledButton(
                key: const ValueKey('dy-yeniden'),
                onPressed: _yeniden,
                child: const Text('Tekrar dene'),
              ),
              const SizedBox(height: Olcu.b1),
              OutlinedButton(
                key: const ValueKey('dy-bitir'),
                onPressed: _cik,
                child: const Text('Bitir'),
              ),
            ],
          ),
        ),
      );
    }

    final k = _deste[_indeks];
    final ipucuMetni = DinleYaz.ipucu(k, _ipucuDuzeyi);
    final sonuc = _sonuc;
    return _iskele(
      SingleChildScrollView(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              '${_indeks + 1} / ${_deste.length}',
              key: const ValueKey('dy-sayac'),
              style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: Olcu.b2),
            Center(
              child: FilledButton.icon(
                key: const ValueKey('dy-dinle'),
                onPressed: _oku,
                icon: const Icon(Icons.volume_up),
                label: const Text('Dinle'),
              ),
            ),
            if (_sesYok) ...[
              const SizedBox(height: Olcu.b1),
              Text(
                'Ses çalışmıyor; metin ipucuyla devam edebilirsin.',
                key: const ValueKey('dy-sesyok'),
                style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
                textAlign: TextAlign.center,
              ),
            ],
            if (ipucuMetni.isNotEmpty) ...[
              const SizedBox(height: Olcu.b1),
              Text(
                ipucuMetni,
                key: const ValueKey('dy-ipucu-metin'),
                style: yazi.bodyMedium,
                textAlign: TextAlign.center,
              ),
            ],
            const SizedBox(height: Olcu.b2),
            TextField(
              key: const ValueKey('dy-yaz'),
              controller: _giris,
              enabled: sonuc == null,
              autocorrect: false,
              enableSuggestions: false,
              textInputAction: TextInputAction.done,
              decoration: const InputDecoration(
                labelText: 'Duyduğun kelimeyi yaz',
                border: OutlineInputBorder(),
              ),
              onSubmitted: (_) => _kontrol(),
            ),
            const SizedBox(height: Olcu.b2),
            if (sonuc == null)
              Wrap(
                spacing: Olcu.b2,
                runSpacing: Olcu.b1,
                alignment: WrapAlignment.center,
                children: [
                  OutlinedButton.icon(
                    key: const ValueKey('dy-ipucu'),
                    onPressed: _ipucuDuzeyi < 2 ? _ipucu : null,
                    icon: const Icon(Icons.lightbulb_outline),
                    label: const Text('İpucu'),
                  ),
                  FilledButton(
                    key: const ValueKey('dy-kontrol'),
                    onPressed: _kontrol,
                    child: const Text('Kontrol et'),
                  ),
                ],
              )
            else ...[
              Text(
                switch (sonuc) {
                  DinleYazSonucu.dogru => 'Doğru!',
                  DinleYazSonucu.aksanFarki =>
                    'Doğru! Yazılışı: ${k.metin} (aksanlara dikkat)',
                  DinleYazSonucu.yanlis => 'Doğrusu: ${k.metin}',
                },
                key: const ValueKey('dy-geri-bildirim'),
                style: yazi.titleMedium?.copyWith(
                  color: sonuc == DinleYazSonucu.yanlis ? r.vurgu : r.ana,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: Olcu.b1),
              Text(
                'Anlamı: ${k.anlam}',
                style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: Olcu.b2),
              FilledButton(
                key: const ValueKey('dy-sonraki'),
                onPressed: _ilerle,
                child: Text(
                  _indeks == _deste.length - 1 ? 'Sonucu gör' : 'Sonraki',
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
