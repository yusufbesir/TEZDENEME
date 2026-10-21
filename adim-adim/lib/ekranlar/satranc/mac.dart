/// Mini maç (ÖZELLİK 47): hazır konumdan bilgisayara karşı kısa, çevrimdışı
/// oyun; oyun sonu incelemesi: oynanan hamle listesi, maddi değerlendirme
/// eğrisi ve istenen hamlenin derinlik-2 aramayla basit değerlendirmesi.
/// Çevrim içi rakip ve derecelendirme yoktur.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../bilesenler/satranc_tahtasi.dart';
import '../../durum/saglayicilar.dart';
import '../../model/durum.dart';
import '../../model/satranc_durumu.dart';
import '../../satranc/oyun.dart';
import '../../satranc/satranc.dart';
import '../../satranc/veri.dart';
import '../../satranc/yz.dart';
import '../../tema/tema.dart';
import 'bilgisayar_oyunu.dart';
import 'ortak.dart';

/// Mini maç konum seçimi.
class MiniMacSecimiEkrani extends ConsumerWidget {
  const MiniMacSecimiEkrani({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final s = durum.satranc;
    return satrancIskele(
      context,
      'Mini maç',
      ListView(
        padding: const EdgeInsets.all(Olcu.b2),
        children: [
          Text(
            'Hazır bir konumdan bilgisayara karşı oyna. Çevrimdışı; derece '
            'ya da rakip yok. Kazandın ${s.macSayilari[SatrancMaci.kazandi] ?? 0}, '
            'berabere ${s.macSayilari[SatrancMaci.berabere] ?? 0}, '
            'yenildin ${s.macSayilari[SatrancMaci.yenildi] ?? 0}.',
            key: const Key('mac-ozet'),
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: context.renkler.metinIkincil,
            ),
          ),
          const SizedBox(height: Olcu.b2),
          for (final m in SatrancVeri.miniMaclar)
            satrancKart(
              context,
              anahtar: ValueKey('mac-${m.id}'),
              simge: Icons.sports_esports_outlined,
              baslik: m.ad,
              ayrinti:
                  '${m.aciklama} ${m.kullaniciBeyaz ? 'Beyazla oynarsın.' : 'Siyahla oynarsın.'}',
              onTap: () => context.push('/satranc/mac/${m.id}'),
            ),
          if (s.sonMac != null) ...[
            const SizedBox(height: Olcu.b1),
            OutlinedButton.icon(
              key: const Key('mac-son-incele'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(Olcu.hedef, Olcu.hedef),
              ),
              onPressed: () => context.push('/satranc/inceleme'),
              icon: const Icon(Icons.manage_search),
              label: const Text('Son oyunu incele'),
            ),
          ],
        ],
      ),
    );
  }
}

/// Bir mini maçı oynatır; bitince sonucu kaydeder ve incelemeyi önerir.
class MiniMacEkrani extends ConsumerStatefulWidget {
  const MiniMacEkrani({super.key, required this.konumId});
  final String konumId;

  @override
  ConsumerState<MiniMacEkrani> createState() => _MiniMacDurumu();
}

class _MiniMacDurumu extends ConsumerState<MiniMacEkrani> {
  int _oyunNo = 0;
  ({String sonuc, String neden})? _bitis;

  void _bitti(MiniMacKonumu m, MacDurumu mac, String sonuc, String neden) {
    final bugun = ref.read(bugunProvider);
    ref
        .read(durumProvider.notifier)
        .satrancMacBitir(
          SatrancMaci(
            konumId: m.id,
            fen: mac.baslangicFen,
            hamleler: mac.gecmis,
            sonuc: sonuc,
            gun: bugun,
            kullaniciBeyaz: mac.kullaniciBeyaz,
          ),
        );
    setState(() => _bitis = (sonuc: sonuc, neden: neden));
  }

  @override
  Widget build(BuildContext context) {
    final m = SatrancVeri.miniMacBul(widget.konumId);
    if (m == null) {
      return satrancIskele(
        context,
        'Mini maç',
        satrancBosMesaj(context, 'Bu konum bulunamadı.'),
      );
    }
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final bitis = _bitis;
    final baslik = bitis == null
        ? null
        : switch (bitis.sonuc) {
            SatrancMaci.kazandi => 'Kazandın!',
            SatrancMaci.yenildi => 'Yenildin',
            _ => 'Berabere',
          };
    return satrancIskele(
      context,
      m.ad,
      SingleChildScrollView(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            BilgisayarOyunu(
              key: ValueKey('oyun-$_oyunNo'),
              baslangic: MacDurumu.baslat(
                m.fen,
                kullaniciBeyaz: m.kullaniciBeyaz,
              ),
              pesEt: true,
              geriAl: true,
              onBitti: (mac, sonuc, neden) => _bitti(m, mac, sonuc, neden),
            ),
            if (bitis != null) ...[
              const SizedBox(height: Olcu.b2),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(Olcu.b2),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        baslik!,
                        key: const Key('mac-sonuc'),
                        style: yazi.titleMedium?.copyWith(
                          color: bitis.sonuc == SatrancMaci.yenildi
                              ? r.hata
                              : r.dogru,
                        ),
                      ),
                      Text(bitis.neden, style: yazi.bodyMedium),
                      const SizedBox(height: Olcu.b2),
                      Wrap(
                        spacing: Olcu.b1,
                        runSpacing: Olcu.b1,
                        children: [
                          FilledButton.icon(
                            key: const Key('mac-incele'),
                            style: FilledButton.styleFrom(
                              minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                            ),
                            onPressed: () => context.push('/satranc/inceleme'),
                            icon: const Icon(Icons.manage_search),
                            label: const Text('Oyunu incele'),
                          ),
                          OutlinedButton.icon(
                            key: const Key('mac-yeniden'),
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                            ),
                            onPressed: () => setState(() {
                              _oyunNo++;
                              _bitis = null;
                            }),
                            icon: const Icon(Icons.replay),
                            label: const Text('Yeniden oyna'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Oyun sonu incelemesi: son mini maçın hamle listesi, maddi eğrisi ve
/// hamle değerlendirmesi. Konum, ileri/geri düğmeleriyle gezilir.
class IncelemeEkrani extends ConsumerStatefulWidget {
  const IncelemeEkrani({super.key});

  @override
  ConsumerState<IncelemeEkrani> createState() => _IncelemeDurumu();
}

class _IncelemeDurumu extends ConsumerState<IncelemeEkrani> {
  int _i = 0; // 0: başlangıç; k: k. yarım hamle sonrası
  bool _ilkAcilis = true;
  final Map<int, HamleDegerlendirmesi> _degerler = {};
  bool _hesapliyor = false;

  void _git(int i, int son) =>
      setState(() => _i = i < 0 ? 0 : (i > son ? son : i));

  Future<void> _degerlendir(List<IncelemeAdimi> adimlar, int sira) async {
    if (_degerler.containsKey(sira) || _hesapliyor) return;
    setState(() => _hesapliyor = true);
    await Future<void>.delayed(const Duration(milliseconds: 20));
    if (!mounted) return;
    final a = adimlar[sira];
    final d = MacIncelemesi.degerlendir(Konum.fen(a.fenOnce), a.uci);
    setState(() {
      _degerler[sira] = d;
      _hesapliyor = false;
    });
  }

  Future<void> _hepsiniDegerlendir(List<IncelemeAdimi> adimlar) async {
    if (_hesapliyor) return;
    setState(() => _hesapliyor = true);
    for (final a in adimlar) {
      if (!a.kullanici || _degerler.containsKey(a.sira)) continue;
      await Future<void>.delayed(const Duration(milliseconds: 5));
      if (!mounted) return;
      final d = MacIncelemesi.degerlendir(Konum.fen(a.fenOnce), a.uci);
      setState(() => _degerler[a.sira] = d);
    }
    if (mounted) setState(() => _hesapliyor = false);
  }

  @override
  Widget build(BuildContext context) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final mac = durum.satranc.sonMac;
    if (mac == null) {
      return satrancIskele(
        context,
        'Oyun incelemesi',
        satrancBosMesaj(
          context,
          'İncelenecek oyun yok. Önce bir mini maç oyna.',
        ),
      );
    }
    final adimlar = MacIncelemesi.adimlar(
      mac.fen,
      mac.hamleler,
      mac.kullaniciBeyaz,
    );
    final son = adimlar.length;
    if (_ilkAcilis) {
      _i = son; // son konumdan başla
      _ilkAcilis = false;
    }
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final konum = Konum.fen(_i == 0 ? mac.fen : adimlar[_i - 1].fenSonra);
    final simdiki = _i == 0 ? null : adimlar[_i - 1];
    final sonucMetni = switch (mac.sonuc) {
      SatrancMaci.kazandi => 'Kazandın',
      SatrancMaci.yenildi => 'Yenildin',
      _ => 'Berabere',
    };
    final degerlendirilen = _degerler.values.toList();
    int say(String e) => degerlendirilen.where((d) => d.etiket == e).length;
    final maddi = simdiki?.maddi ?? SatrancYZ.materyal(konum);
    return satrancIskele(
      context,
      'Oyun incelemesi',
      SingleChildScrollView(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '$sonucMetni · ${adimlar.length} yarım hamle · ${mac.gun}',
              key: const Key('inceleme-ozet'),
              style: yazi.titleSmall,
            ),
            const SizedBox(height: Olcu.b1),
            Center(
              child: LayoutBuilder(
                builder: (context, kisit) {
                  final kenar =
                      kisit.maxWidth.clamp(0.0, satrancTahtaEnBuyukKenar) -
                      2 * SatrancTahtasi.cerceve;
                  return SatrancTahtasi(
                    konum: konum,
                    kenar: kenar < 0 ? 0 : kenar,
                    beyazAltta: mac.kullaniciBeyaz,
                    etkin: false,
                    sonKaynak: simdiki == null
                        ? null
                        : kareNo(simdiki.uci.substring(0, 2)),
                    sonHedef: simdiki == null
                        ? null
                        : kareNo(simdiki.uci.substring(2, 4)),
                  );
                },
              ),
            ),
            const SizedBox(height: Olcu.b1),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(
                  key: const Key('inceleme-basa'),
                  tooltip: 'Başa',
                  onPressed: _i > 0 ? () => _git(0, son) : null,
                  icon: const Icon(Icons.first_page),
                ),
                IconButton(
                  key: const Key('inceleme-geri'),
                  tooltip: 'Önceki hamle',
                  onPressed: _i > 0 ? () => _git(_i - 1, son) : null,
                  icon: const Icon(Icons.chevron_left),
                ),
                IconButton(
                  key: const Key('inceleme-ileri'),
                  tooltip: 'Sonraki hamle',
                  onPressed: _i < son ? () => _git(_i + 1, son) : null,
                  icon: const Icon(Icons.chevron_right),
                ),
                IconButton(
                  key: const Key('inceleme-sona'),
                  tooltip: 'Sona',
                  onPressed: _i < son ? () => _git(son, son) : null,
                  icon: const Icon(Icons.last_page),
                ),
              ],
            ),
            Text(
              simdiki == null
                  ? 'Başlangıç konumu'
                  : '${simdiki.etiket} · ${simdiki.kullanici ? 'senin hamlen' : 'bilgisayarın hamlesi'}',
              key: const Key('inceleme-hamle'),
              style: yazi.titleSmall,
            ),
            Text(
              'Maddi fark (beyaz açısından): ${SatrancYZ.puanMetni(maddi)}',
              key: const Key('inceleme-maddi'),
              style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
            ),
            if (simdiki != null && simdiki.kullanici) ...[
              const SizedBox(height: Olcu.b1),
              if (_degerler[simdiki.sira] case final d?)
                Text(
                  d.kayip <= 30
                      ? '${d.etiket}.'
                      : '${d.etiket}. Önerilen: ${d.oneri} '
                            '(kayıp ${(d.kayip / 100).toStringAsFixed(1).replaceAll('.', ',')} piyon).',
                  key: const Key('inceleme-degerlendirme'),
                  style: yazi.bodyMedium?.copyWith(
                    color: d.kayip > 100 ? r.hata : r.dogru,
                  ),
                )
              else
                OutlinedButton.icon(
                  key: const Key('inceleme-degerlendir'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                  ),
                  onPressed: _hesapliyor
                      ? null
                      : () => _degerlendir(adimlar, simdiki.sira),
                  icon: const Icon(Icons.analytics_outlined),
                  label: const Text('Bu hamleyi değerlendir'),
                ),
            ],
            const SizedBox(height: Olcu.b2),
            Wrap(
              spacing: Olcu.b1,
              runSpacing: Olcu.b1,
              children: [
                OutlinedButton.icon(
                  key: const Key('inceleme-hepsi'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                  ),
                  onPressed: _hesapliyor || adimlar.isEmpty
                      ? null
                      : () => _hepsiniDegerlendir(adimlar),
                  icon: const Icon(Icons.fact_check_outlined),
                  label: const Text('Tüm hamlelerimi değerlendir'),
                ),
              ],
            ),
            if (_hesapliyor)
              const Padding(
                padding: EdgeInsets.only(top: Olcu.b1),
                child: LinearProgressIndicator(),
              ),
            if (degerlendirilen.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: Olcu.b1),
                child: Text(
                  'Hamlelerin: ${say('İyi hamle') + say('Mat!')} iyi, '
                  '${say('Fena değil')} fena değil, ${say('Yanlış')} yanlış, '
                  '${say('Büyük hata')} büyük hata.',
                  key: const Key('inceleme-toplam'),
                  style: yazi.bodyMedium,
                ),
              ),
            const SizedBox(height: Olcu.b2),
            Text('Hamleler', style: yazi.titleSmall),
            const SizedBox(height: Olcu.b1),
            Wrap(
              spacing: Olcu.b1,
              runSpacing: Olcu.b1,
              children: [
                for (final a in adimlar)
                  ChoiceChip(
                    key: Key('inceleme-chip-${a.sira}'),
                    label: Text(a.etiket),
                    selected: _i == a.sira + 1,
                    onSelected: (_) => _git(a.sira + 1, son),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
