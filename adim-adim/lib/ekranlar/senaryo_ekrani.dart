/// Senaryolu konuşma ekranları (ÖZELLİK 65): yazılı, dallanan, iki taraflı
/// balonlu sohbetler; tümü çevrimdışı. [SenaryoListesiEkrani] kullanıcının
/// dillerindeki senaryoları sıralar; [SenaryoEkrani] konuşmayı yürütür.
/// Kullanıcı cevabı seçerek, yazarak ya da konuşarak verir (konuşma tanıma
/// hazır değilse "konuşarak" kapalıdır, mevcut 8.7 kalıbı). Uygun olmayan
/// cevap nazik bir notla aynı adımda bırakılır; ceza yok, XP/kart/hata defteri
/// değişmez, yalnız bitirme sayısı tutulur. Pratik merkezinden açılır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../icerik/senaryolar.dart';
import '../model/durum.dart';
import '../model/senaryo.dart';
import '../motor/senaryo.dart';
import '../motor/telaffuz.dart';
import '../servis/konusma.dart';
import '../servis/konusma_dinle.dart';
import '../tema/tema.dart';

class SenaryoListesiEkrani extends ConsumerWidget {
  const SenaryoListesiEkrani({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final liste = Senaryolar.listele(
      tumSenaryolar,
      ref.watch(alanKurslariProvider),
    );
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Senaryolu konuşma'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/pratik'),
        ),
      ),
      body: SafeArea(
        child: SayfaGovdesi(
          child: liste.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(Olcu.b3),
                    child: Text(
                      'Senaryolar İngilizce, Almanca ve Korece kurslarında '
                      'açılır.',
                      style: yazi.bodyLarge,
                      textAlign: TextAlign.center,
                    ),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.all(Olcu.b2),
                  children: [
                    Text(
                      'Karşı tarafla kısa sohbetler: cevabı seç, yaz ya da '
                      'söyle. Çevrimdışı; ceza yok.',
                      style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                    ),
                    const SizedBox(height: Olcu.b2),
                    for (final s in liste)
                      Card(
                        child: ListTile(
                          key: ValueKey('senaryo-${s.id}'),
                          minVerticalPadding: Olcu.b1,
                          leading: Icon(Icons.forum_outlined, color: r.ana),
                          title: Text(s.baslik),
                          subtitle: Text(
                            (durum.senaryolar[s.id] ?? 0) > 0
                                ? '${s.aciklama} · ${durum.senaryolar[s.id]} kez bitirdin'
                                : s.aciklama,
                          ),
                          trailing: (durum.senaryolar[s.id] ?? 0) > 0
                              ? Icon(Icons.check_circle, color: r.dogru)
                              : const Icon(Icons.chevron_right),
                          onTap: () => context.push(
                            '/senaryo/${Uri.encodeComponent(s.id)}',
                          ),
                        ),
                      ),
                  ],
                ),
        ),
      ),
    );
  }
}

enum _Mod { sec, yaz, konus }

class SenaryoEkrani extends ConsumerStatefulWidget {
  const SenaryoEkrani({super.key, required this.senaryoId});
  final String senaryoId;

  @override
  ConsumerState<SenaryoEkrani> createState() => _SenaryoDurumu();
}

class _SenaryoDurumu extends ConsumerState<SenaryoEkrani> {
  Senaryo? _senaryo;
  SenaryoAkisi? _akis;
  _Mod _mod = _Mod.sec;
  bool _ceviri = true;
  bool _kaydedildi = false;
  final _yazi = TextEditingController();
  final _kaydirma = ScrollController();

  /// Girdi çözülemediğinde gösterilen kısa mesaj (yazarak/konuşarak).
  String? _mesaj;

  /// null: tanıma hazırlığı denetleniyor.
  bool? _tanimaHazir;
  bool _dinliyor = false;
  late final KonusmaTanima _konusma;

  @override
  void initState() {
    super.initState();
    _konusma = ref.read(konusmaProvider);
    for (final s in tumSenaryolar) {
      if (s.id == widget.senaryoId) _senaryo = s;
    }
    if (_senaryo != null) _akis = SenaryoAkisi(_senaryo!);
    _hazirligiDenetle();
  }

  @override
  void dispose() {
    _yazi.dispose();
    _kaydirma.dispose();
    super.dispose();
  }

  Future<void> _hazirligiDenetle() async {
    var hazir = false;
    try {
      hazir = await _konusma.hazirMi();
    } catch (_) {
      hazir = false;
    }
    if (mounted) setState(() => _tanimaHazir = hazir);
  }

  void _asagiKaydir() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_kaydirma.hasClients) {
        _kaydirma.jumpTo(_kaydirma.position.maxScrollExtent);
      }
    });
  }

  void _cevapla(int indeks) {
    final akis = _akis;
    if (akis == null) return;
    final adim = akis.cevapla(indeks);
    setState(() {
      _mesaj = null;
      _yazi.clear();
    });
    if (adim == SenaryoAdimi.bitti && !_kaydedildi) {
      _kaydedildi = true;
      ref.read(durumProvider.notifier).senaryoBitir(_senaryo!.id);
    }
    _asagiKaydir();
  }

  void _yazilanGonder() {
    final akis = _akis;
    if (akis == null) return;
    final i = akis.yazilanCevap(_yazi.text);
    if (i == null) {
      setState(
        () => _mesaj =
            'Hangi cevabı kastettiğini anlayamadım. Verilen anlamlardan '
            'birini hedef dilde yaz.',
      );
      return;
    }
    _cevapla(i);
  }

  Future<void> _konus() async {
    final akis = _akis;
    if (akis == null || _dinliyor) return;
    try {
      if (!await _konusma.izinIste()) {
        if (mounted) {
          setState(() {
            _tanimaHazir = false;
            _mesaj = 'Mikrofon izni verilmedi';
            _mod = _Mod.sec;
          });
        }
        return;
      }
    } catch (_) {
      if (mounted) setState(() => _tanimaHazir = false);
      return;
    }
    if (!mounted) return;
    setState(() {
      _dinliyor = true;
      _mesaj = null;
    });
    final soylenen = await konusmayiDinle(_konusma, dil: _senaryo!.dil);
    if (!mounted) return;
    setState(() => _dinliyor = false);
    if (telaffuzSessiz(soylenen)) {
      setState(
        () => _mesaj = 'Bir şey duyamadım; mikrofona dokunup tekrar söyle.',
      );
      return;
    }
    final i = akis.soylenenCevap(soylenen);
    if (i == null) {
      setState(
        () => _mesaj =
            'Duydum: "$soylenen". Seçeneklerden birine yeterince benzemedi; '
            'tekrar dene.',
      );
      return;
    }
    _cevapla(i);
  }

  @override
  Widget build(BuildContext context) {
    final senaryo = _senaryo;
    final akis = _akis;
    void geri() => context.canPop() ? context.pop() : context.go('/senaryolar');
    if (senaryo == null || akis == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Senaryolu konuşma')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(Olcu.b3),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Senaryo bulunamadı.'),
                const SizedBox(height: Olcu.b2),
                FilledButton(onPressed: geri, child: const Text('Geri dön')),
              ],
            ),
          ),
        ),
      );
    }
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final sesAcik = ref.watch(durumProvider).value?.sesAcik ?? true;
    final konusmaAcik = ref.watch(durumProvider).value?.konusmaAcik ?? true;
    final konusmaVar = konusmaAcik && _tanimaHazir == true;

    Widget balon(SenaryoBalonu b) {
      final kul = b.kullanici;
      final uyari = b.not != null;
      return Align(
        alignment: kul ? Alignment.centerRight : Alignment.centerLeft,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.sizeOf(context).width * 0.82,
          ),
          child: Container(
            margin: const EdgeInsets.symmetric(vertical: Olcu.b1 / 2),
            padding: const EdgeInsets.all(Olcu.b2),
            decoration: BoxDecoration(
              color: kul ? r.ana.withValues(alpha: 0.12) : r.yuzey,
              border: Border.all(color: uyari ? r.hata : r.kenar),
              borderRadius: BorderRadius.circular(Olcu.kose),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Semantics(
                  label: '${kul ? 'Sen' : 'Karşı taraf'}: ${b.metin}',
                  excludeSemantics: true,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Flexible(child: Text(b.metin, style: yazi.titleMedium)),
                      if (!kul)
                        IconButton(
                          icon: const Icon(Icons.volume_up_outlined, size: 20),
                          tooltip: 'Oku',
                          visualDensity: VisualDensity.compact,
                          onPressed: sesAcik
                              ? () => ref
                                    .read(sesProvider)
                                    .oku(b.metin, dil: senaryo.dil)
                              : null,
                        ),
                    ],
                  ),
                ),
                if (_ceviri)
                  Text(
                    b.anlam,
                    style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                  ),
                if (uyari) ...[
                  const SizedBox(height: Olcu.b1),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.info_outline, size: 18, color: r.hata),
                      const SizedBox(width: Olcu.b1),
                      Expanded(
                        child: Text(
                          b.not!,
                          key: const ValueKey('senaryo-not'),
                          style: yazi.bodyMedium?.copyWith(color: r.hata),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      );
    }

    Widget cevapAlani() {
      if (akis.bitti) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(Icons.check_circle, color: r.dogru),
                const SizedBox(width: Olcu.b1),
                Expanded(
                  child: Text(
                    'Konuşma bitti. Ceza yok; puanın ve kartların değişmedi.',
                    key: const ValueKey('senaryo-bitti'),
                    style: yazi.titleMedium,
                  ),
                ),
              ],
            ),
            const SizedBox(height: Olcu.b2),
            Row(
              children: [
                Expanded(
                  child: FilledButton(
                    key: const ValueKey('senaryo-yeniden'),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(48, 48),
                    ),
                    onPressed: () => setState(() {
                      _akis = SenaryoAkisi(senaryo);
                      _kaydedildi = false;
                      _mesaj = null;
                    }),
                    child: const Text('Yeniden oyna'),
                  ),
                ),
                const SizedBox(width: Olcu.b2),
                Expanded(
                  child: OutlinedButton(
                    key: const ValueKey('senaryo-liste'),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(48, 48),
                    ),
                    onPressed: geri,
                    child: const Text('Listeye dön'),
                  ),
                ),
              ],
            ),
          ],
        );
      }
      final cevaplar = akis.cevaplar;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SegmentedButton<_Mod>(
            key: const ValueKey('senaryo-mod'),
            showSelectedIcon: false,
            segments: [
              const ButtonSegment(
                value: _Mod.sec,
                icon: Icon(Icons.touch_app_outlined),
                label: Text('Seç'),
              ),
              const ButtonSegment(
                value: _Mod.yaz,
                icon: Icon(Icons.keyboard_outlined),
                label: Text('Yaz'),
              ),
              ButtonSegment(
                value: _Mod.konus,
                icon: const Icon(Icons.mic_none),
                label: const Text('Söyle'),
                enabled: konusmaVar,
              ),
            ],
            selected: {_mod},
            onSelectionChanged: (s) => setState(() {
              _mod = s.first;
              _mesaj = null;
            }),
          ),
          if (!konusmaVar && _tanimaHazir != null)
            Padding(
              padding: const EdgeInsets.only(top: Olcu.b1),
              child: Text(
                konusmaAcik
                    ? 'Konuşma tanıma bu cihazda hazır değil; seçerek ya da '
                          'yazarak cevapla.'
                    : 'Konuşma alıştırmaları ayarlardan kapalı.',
                key: const ValueKey('senaryo-tanima-yok'),
                style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
              ),
            ),
          const SizedBox(height: Olcu.b2),
          if (_mod == _Mod.sec)
            for (var i = 0; i < cevaplar.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: Olcu.b1),
                child: OutlinedButton(
                  key: ValueKey('senaryo-cevap-$i'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(48, 48),
                    alignment: Alignment.centerLeft,
                  ),
                  onPressed: () => _cevapla(i),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(cevaplar[i].metin),
                      if (_ceviri)
                        Text(
                          cevaplar[i].anlam,
                          style: yazi.bodySmall?.copyWith(
                            color: r.metinIkincil,
                          ),
                        ),
                    ],
                  ),
                ),
              )
          else if (_mod == _Mod.yaz) ...[
            Text('Şunlardan birini hedef dilde yaz:', style: yazi.bodyMedium),
            for (final c in cevaplar)
              Padding(
                padding: const EdgeInsets.only(top: Olcu.b1 / 2),
                child: Text('• ${c.anlam}', style: yazi.bodyMedium),
              ),
            const SizedBox(height: Olcu.b1),
            TextField(
              key: const ValueKey('senaryo-yaz'),
              controller: _yazi,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => _yazilanGonder(),
              decoration: const InputDecoration(labelText: 'Cevabın'),
            ),
            const SizedBox(height: Olcu.b1),
            FilledButton(
              key: const ValueKey('senaryo-gonder'),
              style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: _yazilanGonder,
              child: const Text('Gönder'),
            ),
          ] else ...[
            Text(
              'Şunlardan birini yüksek sesle söyle:',
              style: yazi.bodyMedium,
            ),
            for (final c in cevaplar)
              Padding(
                padding: const EdgeInsets.only(top: Olcu.b1 / 2),
                child: Text('• ${c.metin}', style: yazi.bodyMedium),
              ),
            const SizedBox(height: Olcu.b2),
            Center(
              child: FilledButton.icon(
                key: const ValueKey('senaryo-mikrofon'),
                style: FilledButton.styleFrom(minimumSize: const Size(48, 56)),
                onPressed: _dinliyor ? null : _konus,
                icon: Icon(_dinliyor ? Icons.hearing : Icons.mic),
                label: Text(_dinliyor ? 'Dinliyorum…' : 'Konuş'),
              ),
            ),
          ],
          if (_mesaj != null)
            Padding(
              padding: const EdgeInsets.only(top: Olcu.b1),
              child: Text(
                _mesaj!,
                key: const ValueKey('senaryo-mesaj'),
                style: yazi.bodyMedium?.copyWith(color: r.hata),
              ),
            ),
        ],
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(senaryo.baslik),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: geri,
        ),
        actions: [
          IconButton(
            key: const ValueKey('senaryo-ceviri'),
            icon: Icon(_ceviri ? Icons.translate : Icons.translate_outlined),
            tooltip: _ceviri ? 'Çeviriyi gizle' : 'Çeviriyi göster',
            onPressed: () => setState(() => _ceviri = !_ceviri),
          ),
        ],
      ),
      body: SafeArea(
        child: SayfaGovdesi(
          child: Column(
            children: [
              Expanded(
                child: ListView(
                  controller: _kaydirma,
                  padding: const EdgeInsets.all(Olcu.b2),
                  children: [for (final b in akis.balonlar) balon(b)],
                ),
              ),
              Container(
                decoration: BoxDecoration(
                  border: Border(top: BorderSide(color: r.kenar)),
                ),
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.sizeOf(context).height * 0.5,
                ),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(Olcu.b2),
                  child: cevapAlani(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
