// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Örnek programlar kütüphanesi: liste ekranı (`/ornekler`, dil süzgeci
/// çipleri: Tümü / HTML / CSS / JavaScript) ve detay ekranı (`/ornek/:id`:
/// başlık, açıklama, her satır grubu için kod + "ne yapar" notu, "Kodu
/// kopyala" düğmesi). Kod çalıştırılmaz. Kabuğun dışında `push` ile açılır.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/sayfa_govdesi.dart';
import '../icerik/ornek_programlar.dart';
import '../model/ornek_program.dart';
import '../tema/tema.dart';

void _geri(BuildContext context) =>
    context.canPop() ? context.pop() : context.go('/yol');

class OrnekProgramlarEkrani extends StatefulWidget {
  const OrnekProgramlarEkrani({super.key});

  @override
  State<OrnekProgramlarEkrani> createState() => _OrnekListeDurumu();
}

class _OrnekListeDurumu extends State<OrnekProgramlarEkrani> {
  /// null: Tümü.
  OrnekDili? _dil;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final liste = [
      for (final o in tumOrnekler)
        if (_dil == null || o.dil == _dil) o,
    ];
    Widget cip(String etiket, OrnekDili? deger) => FilterChip(
      key: ValueKey('ornek-cip-${deger?.name ?? 'tumu'}'),
      label: Text(etiket),
      selected: _dil == deger,
      showCheckmark: false,
      onSelected: (_) => setState(() => _dil = deger),
    );
    return Scaffold(
      appBar: AppBar(
        title: const Text('Örnek programlar'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: () => _geri(context),
        ),
      ),
      body: SafeArea(
        child: SayfaGovdesi(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(
                  Olcu.b3,
                  Olcu.b2,
                  Olcu.b3,
                  Olcu.b1,
                ),
                child: Row(
                  children: [
                    cip('Tümü', null),
                    for (final d in OrnekDili.values) ...[
                      const SizedBox(width: Olcu.b1),
                      cip(d.etiket, d),
                    ],
                  ],
                ),
              ),
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.only(bottom: Olcu.b3),
                  itemCount: liste.length,
                  itemBuilder: (c, i) {
                    final o = liste[i];
                    return Semantics(
                      button: true,
                      label:
                          '${o.dil.etiket}, ${o.zorluk.etiket}: ${o.baslik}. ${o.aciklama}',
                      excludeSemantics: true,
                      child: ListTile(
                        key: ValueKey('ornek-satir-${o.id}'),
                        minVerticalPadding: Olcu.b1,
                        title: Text(
                          o.baslik,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text(
                          '${o.dil.etiket} · ${o.zorluk.etiket}\n${o.aciklama}',
                          style: yazi.bodySmall?.copyWith(
                            color: r.metinIkincil,
                          ),
                        ),
                        isThreeLine: true,
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () =>
                            context.push('/ornek/${Uri.encodeComponent(o.id)}'),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class OrnekDetayEkrani extends StatelessWidget {
  const OrnekDetayEkrani({super.key, required this.ornekId});
  final String ornekId;

  Future<void> _kopyala(BuildContext context, OrnekProgram o) async {
    final mesajci = ScaffoldMessenger.of(context);
    await Clipboard.setData(ClipboardData(text: o.kod));
    mesajci.showSnackBar(const SnackBar(content: Text('Kod kopyalandı.')));
  }

  @override
  Widget build(BuildContext context) {
    final o = ornekBul(ornekId);
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(
        title: Text(o?.baslik ?? 'Örnek bulunamadı'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: () => _geri(context),
        ),
      ),
      body: SafeArea(
        child: o == null
            ? const Center(child: Text('Bu örnek bulunamadı.'))
            : SayfaGovdesi(
                child: ListView(
                  padding: const EdgeInsets.all(Olcu.b3),
                  children: [
                    Text(
                      '${o.dil.etiket} · ${o.zorluk.etiket}',
                      style: yazi.labelLarge?.copyWith(color: r.ana),
                    ),
                    const SizedBox(height: Olcu.b1),
                    Text(o.aciklama, style: yazi.bodyLarge),
                    const SizedBox(height: Olcu.b2),
                    OutlinedButton.icon(
                      key: const ValueKey('ornek-kopyala'),
                      icon: const Icon(Icons.copy),
                      label: const Text('Kodu kopyala'),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(48, 48),
                      ),
                      onPressed: () => _kopyala(context, o),
                    ),
                    const SizedBox(height: Olcu.b2),
                    for (var i = 0; i < o.gruplar.length; i++) ...[
                      Card(
                        key: ValueKey('ornek-grup-$i'),
                        child: Padding(
                          padding: const EdgeInsets.all(Olcu.b2),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SingleChildScrollView(
                                scrollDirection: Axis.horizontal,
                                child: SelectableText(
                                  o.gruplar[i].kod,
                                  style: yazi.bodyMedium?.copyWith(
                                    fontFamily: yaziKod,
                                  ),
                                ),
                              ),
                              const SizedBox(height: Olcu.b1),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(
                                    Icons.lightbulb_outline,
                                    size: 20,
                                    color: r.ana,
                                  ),
                                  const SizedBox(width: Olcu.b1),
                                  Expanded(
                                    child: Text(
                                      o.gruplar[i].not,
                                      style: yazi.bodyMedium?.copyWith(
                                        color: r.metinIkincil,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: Olcu.b1),
                    ],
                  ],
                ),
              ),
      ),
    );
  }
}
