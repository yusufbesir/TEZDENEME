/// Projeler ve oyun alanı (ÖZELLİK 70, `/projeler` ve `/proje/:id`).
///
/// Bölüm sonu proje şablonları (HTML, CSS, JS) ve serbest çok dosyalı oyun
/// alanları. Proje durum dosyasına kaydedilir (boyut sınırlı). Önizleme
/// WebView gerektirmez: HTML yalnız yapı ve metin olarak gösterilir, CSS ve
/// JS uygulanmaz; gerçek görünüm için birleştirilmiş HTML panoya kopyalanır
/// ya da .html dosyası olarak kaydedilip tarayıcıda açılır. JS dosyaları
/// konsolda (DOM olmadan) çalıştırılabilir. Kullanıcı kodu Text olarak
/// gösterilir; hiçbir zaman yorumlanmaz.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/alistirma/kod_etkilesim.dart';
import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../icerik/icerik.dart';
import '../icerik/projeler.dart';
import '../model/durum.dart';
import '../model/kod_calisma.dart';
import '../motor/kod_projesi.dart';
import '../tema/tema.dart';

class ProjelerEkrani extends ConsumerWidget {
  const ProjelerEkrani({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final d = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final oyunlar = [
      for (final p in d.kodProjeleri)
        if (p.sablonId == null) p,
    ];
    return Scaffold(
      appBar: AppBar(title: const Text('Projeler ve oyun alanı')),
      body: SayfaGovdesi(
        child: ListView(
          padding: const EdgeInsets.all(Olcu.b2),
          children: [
            Text('Bölüm sonu projeleri', style: yazi.titleMedium),
            const SizedBox(height: Olcu.b1),
            for (final s in projeSablonlari)
              Builder(
                builder: (context) {
                  final p = KodProjeleri.bul(d, s.projeId);
                  final h = p == null
                      ? 0
                      : KodProjeleri.hedefler(s, p).where((e) => e).length;
                  final tamam = KodProjeleri.tamam(s, p);
                  return Card(
                    child: ListTile(
                      key: ValueKey('proje-sablon-${s.id}'),
                      leading: Icon(
                        tamam ? Icons.check_circle : Icons.construction,
                        color: tamam ? r.dogru : r.ana,
                      ),
                      title: Text(s.ad),
                      subtitle: Text(
                        '${kursBul(s.kursId)?.ad ?? s.kursId} · '
                        '$h/${s.hedefler.length} hedef'
                        '${tamam ? ' · tamamlandı' : ''}',
                      ),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push(
                        '/proje/${Uri.encodeComponent(s.projeId)}',
                      ),
                    ),
                  );
                },
              ),
            const SizedBox(height: Olcu.b3),
            Row(
              children: [
                Expanded(child: Text('Oyun alanı', style: yazi.titleMedium)),
                FilledButton.tonalIcon(
                  key: const ValueKey('yeni-oyun-alani'),
                  icon: const Icon(Icons.add),
                  label: const Text('Yeni'),
                  onPressed: () => _yeniOyun(context, ref),
                ),
              ],
            ),
            const SizedBox(height: Olcu.b1),
            if (oyunlar.isEmpty)
              Text(
                'Henüz oyun alanı yok. HTML, CSS ve JS dosyalarıyla serbestçe '
                'denemek için "Yeni"ye bas.',
                style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
              ),
            for (final p in oyunlar)
              Card(
                child: ListTile(
                  key: ValueKey('proje-${p.id}'),
                  leading: Icon(Icons.code, color: r.ana),
                  title: Text(p.ad),
                  subtitle: Text(
                    '${p.dosyalar.length} dosya'
                    '${p.gun == null ? '' : ' · ${p.gun}'}',
                  ),
                  trailing: IconButton(
                    tooltip: 'Sil',
                    icon: const Icon(Icons.delete_outline),
                    onPressed: () => _sil(context, ref, p),
                  ),
                  onTap: () =>
                      context.push('/proje/${Uri.encodeComponent(p.id)}'),
                ),
              ),
            const SizedBox(height: Olcu.b2),
            Text(
              'Projeler bu cihazda saklanır (en çok ${KodProjesi.enCokProje} '
              'proje). Önizleme yalnız sayfanın yapısını ve metnini gösterir; '
              'gerçek görünüm için HTML\'i dosyaya kaydedip tarayıcıda aç.',
              style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _yeniOyun(BuildContext context, WidgetRef ref) async {
    final d = ref.read(durumProvider).value ?? const OgrenciDurumu();
    final id = KodProjeleri.yeniOyunId(d);
    final n = id.substring(KodProjesi.oyunOnek.length);
    final p = KodProjeleri.bosOyunAlani(id, 'Oyun alanı $n');
    final mesajci = ScaffoldMessenger.of(context);
    final hata = await ref.read(durumProvider.notifier).projeKaydet(p);
    if (hata != null) {
      mesajci.showSnackBar(SnackBar(content: Text(hata)));
      return;
    }
    if (context.mounted) context.push('/proje/${Uri.encodeComponent(id)}');
  }

  Future<void> _sil(BuildContext context, WidgetRef ref, KodProjesi p) async {
    final onay = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Oyun alanı silinsin mi?'),
        content: Text('"${p.ad}" ve dosyaları silinecek.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Vazgeç'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Sil'),
          ),
        ],
      ),
    );
    if (onay == true) await ref.read(durumProvider.notifier).projeSil(p.id);
  }
}

/// Proje düzenleyici: dosya sekmeleri, kod alanı, hedefler (şablonda),
/// basit önizleme, konsol, kopyala ve dosyaya kaydet.
class ProjeEditorEkrani extends ConsumerStatefulWidget {
  const ProjeEditorEkrani({super.key, required this.projeId});
  final String projeId;

  @override
  ConsumerState<ProjeEditorEkrani> createState() => _ProjeEditorDurumu();
}

enum _Alt { yok, onizleme, konsol }

class _ProjeEditorDurumu extends ConsumerState<ProjeEditorEkrani> {
  KodProjesi? _proje;
  ProjeSablonu? _sablon;
  final _denetci = TextEditingController();
  int _secili = 0;
  bool _degisti = false;
  _Alt _alt = _Alt.yok;
  KodCalismaSonucu? _konsol;
  bool _calisiyor = false;

  @override
  void initState() {
    super.initState();
    final d = ref.read(durumProvider).value ?? const OgrenciDurumu();
    final kayitli = KodProjeleri.bul(d, widget.projeId);
    final sablonId = widget.projeId.startsWith(KodProjesi.sablonOnek)
        ? widget.projeId.substring(KodProjesi.sablonOnek.length)
        : null;
    _sablon = sablonId == null ? null : projeSablonuBul(sablonId);
    _proje = kayitli ?? _sablon?.yeniProje();
    if (_proje != null) _denetci.text = _proje!.dosyalar.first.icerik;
  }

  @override
  void dispose() {
    _denetci.dispose();
    super.dispose();
  }

  /// Düzenleyicideki metni seçili dosyaya yazar.
  void _alanEsitle() {
    final p = _proje;
    if (p == null || _secili >= p.dosyalar.length) return;
    final f = p.dosyalar[_secili];
    if (f.icerik == _denetci.text) return;
    final yeni = [...p.dosyalar];
    yeni[_secili] = (ad: f.ad, icerik: _denetci.text);
    _proje = p.copyWith(dosyalar: List.unmodifiable(yeni));
  }

  void _dosyaSec(int i) {
    _alanEsitle();
    setState(() {
      _secili = i;
      _denetci.text = _proje!.dosyalar[i].icerik;
    });
  }

  Future<bool> _kaydet() async {
    _alanEsitle();
    final p = _proje;
    if (p == null) return false;
    final mesajci = ScaffoldMessenger.of(context);
    final hata = await ref.read(durumProvider.notifier).projeKaydet(p);
    if (!mounted) return false;
    if (hata != null) {
      mesajci.showSnackBar(SnackBar(content: Text(hata)));
      return false;
    }
    setState(() => _degisti = false);
    mesajci
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(
          content: Text('Proje kaydedildi'),
          duration: Duration(seconds: 2),
        ),
      );
    return true;
  }

  Future<void> _dosyaEkle() async {
    final p = _proje!;
    if (p.dosyalar.length >= KodProjesi.enCokDosya) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('En çok ${KodProjesi.enCokDosya} dosya')),
      );
      return;
    }
    final ad = await showDialog<String>(
      context: context,
      builder: (_) => const _DosyaAdiPenceresi(),
    );
    if (ad == null || !mounted) return;
    final temiz = ad.trim().toLowerCase();
    String? hata;
    if (!KodProjesi.dosyaAdiGecerli(temiz)) {
      hata = 'Geçersiz ad. Örnek: sayfa.html, tema.css, oyun.js';
    } else if (p.icerik(temiz) != null) {
      hata = 'Bu adla bir dosya zaten var';
    }
    if (hata != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(hata)));
      return;
    }
    _alanEsitle();
    setState(() {
      _proje = _proje!.copyWith(
        dosyalar: List.unmodifiable([
          ..._proje!.dosyalar,
          (ad: temiz, icerik: ''),
        ]),
      );
      _secili = _proje!.dosyalar.length - 1;
      _denetci.text = '';
      _degisti = true;
    });
  }

  Future<void> _dosyaSil() async {
    final p = _proje!;
    if (p.dosyalar.length <= 1) return;
    final ad = p.dosyalar[_secili].ad;
    final onay = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('$ad silinsin mi?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Vazgeç'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Sil'),
          ),
        ],
      ),
    );
    if (onay != true || !mounted) return;
    setState(() {
      _proje = p.copyWith(
        dosyalar: List.unmodifiable([
          for (final f in p.dosyalar)
            if (f.ad != ad) f,
        ]),
      );
      _secili = 0;
      _denetci.text = _proje!.dosyalar.first.icerik;
      _degisti = true;
    });
  }

  Future<void> _konsoldaCalistir() async {
    _alanEsitle();
    final js = KodProjeleri.jsBirlesik(_proje!);
    setState(() {
      _alt = _Alt.konsol;
      _calisiyor = true;
      _konsol = null;
    });
    final s = js.trim().isEmpty
        ? KodCalismaSonucu(kod: js, hata: 'Projede JavaScript kodu yok')
        : await ref.read(kodCalistiriciProvider).calistir(js);
    if (!mounted) return;
    setState(() {
      _calisiyor = false;
      _konsol = s;
    });
  }

  Future<void> _kopyala() async {
    _alanEsitle();
    final mesajci = ScaffoldMessenger.of(context);
    await Clipboard.setData(ClipboardData(text: KodProjeleri.tekHtml(_proje!)));
    mesajci.showSnackBar(
      const SnackBar(
        content: Text('Tek dosyalık HTML panoya kopyalandı'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  Future<void> _dosyayaKaydet() async {
    _alanEsitle();
    final p = _proje!;
    final mesajci = ScaffoldMessenger.of(context);
    try {
      final yol = await ref
          .read(projeAktariciProvider)
          .kaydet(KodProjeleri.dosyaKoku(p.ad), KodProjeleri.tekHtml(p));
      mesajci.showSnackBar(
        SnackBar(
          content: Text('Kaydedildi: $yol\nTarayıcıda açarak görebilirsin.'),
        ),
      );
    } catch (e) {
      mesajci.showSnackBar(SnackBar(content: Text('Kaydedilemedi: $e')));
    }
  }

  Future<void> _adDegistir() async {
    final ad = await showDialog<String>(
      context: context,
      builder: (_) => _DosyaAdiPenceresi(
        baslik: 'Proje adı',
        ilk: _proje!.ad,
        etiket: 'Ad',
        enCok: KodProjesi.adEnCok,
      ),
    );
    final temiz = ad?.trim();
    if (temiz == null || temiz.isEmpty || !mounted) return;
    setState(() {
      _proje = _proje!.copyWith(ad: temiz);
      _degisti = true;
    });
  }

  Future<void> _cikisSor() async {
    final secim = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Kaydedilmemiş değişiklik var'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, 'vazgec'),
            child: const Text('Vazgeç'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, 'at'),
            child: const Text('Kaydetmeden çık'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, 'kaydet'),
            child: const Text('Kaydet'),
          ),
        ],
      ),
    );
    if (!mounted) return;
    if (secim == 'at') {
      setState(() => _degisti = false);
      if (mounted) context.pop();
    } else if (secim == 'kaydet') {
      if (await _kaydet() && mounted) context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = _proje;
    if (p == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Proje')),
        body: const Center(child: Text('Proje bulunamadı')),
      );
    }
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final s = _sablon;
    final hedefler = s == null ? const <bool>[] : KodProjeleri.hedefler(s, p);
    return PopScope(
      canPop: !_degisti,
      onPopInvokedWithResult: (cikti, _) {
        if (!cikti) _cikisSor();
      },
      child: Scaffold(
        appBar: AppBar(
          title: GestureDetector(
            onTap: _adDegistir,
            child: Text(p.ad, overflow: TextOverflow.ellipsis),
          ),
          actions: [
            IconButton(
              tooltip: 'Adı değiştir',
              icon: const Icon(Icons.edit_outlined),
              onPressed: _adDegistir,
            ),
            IconButton(
              key: const ValueKey('proje-kaydet'),
              tooltip: 'Kaydet',
              icon: const Icon(Icons.save_outlined),
              onPressed: _kaydet,
            ),
          ],
        ),
        body: SayfaGovdesi(
          child: ListView(
            padding: const EdgeInsets.all(Olcu.b2),
            children: [
              if (s != null) ...[
                Text(s.aciklama, style: yazi.bodyMedium),
                const SizedBox(height: Olcu.b1),
                for (var i = 0; i < s.hedefler.length; i++)
                  Semantics(
                    label:
                        '${s.hedefler[i].aciklama}: ${hedefler[i] ? 'tamam' : 'eksik'}',
                    excludeSemantics: true,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        children: [
                          Icon(
                            hedefler[i]
                                ? Icons.check_circle
                                : Icons.radio_button_unchecked,
                            size: 20,
                            color: hedefler[i] ? r.dogru : r.metinIkincil,
                          ),
                          const SizedBox(width: Olcu.b1),
                          Expanded(
                            child: Text(
                              s.hedefler[i].aciklama,
                              style: yazi.bodyMedium,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                Text(
                  'Hedefler yalnız istenen öğenin kodda olup olmadığına bakar; '
                  'sayfanın doğru çalıştığını göstermez.',
                  style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
                ),
                const SizedBox(height: Olcu.b2),
              ],
              Wrap(
                spacing: Olcu.b1,
                runSpacing: Olcu.b1,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  for (var i = 0; i < p.dosyalar.length; i++)
                    ChoiceChip(
                      key: ValueKey('proje-dosya-${p.dosyalar[i].ad}'),
                      label: Text(p.dosyalar[i].ad),
                      selected: i == _secili,
                      onSelected: (_) => _dosyaSec(i),
                    ),
                  ActionChip(
                    key: const ValueKey('proje-dosya-ekle'),
                    avatar: const Icon(Icons.add, size: 18),
                    label: const Text('Dosya'),
                    onPressed: _dosyaEkle,
                  ),
                  if (p.dosyalar.length > 1)
                    IconButton(
                      tooltip: 'Seçili dosyayı sil',
                      icon: const Icon(Icons.delete_outline),
                      onPressed: _dosyaSil,
                    ),
                ],
              ),
              const SizedBox(height: Olcu.b2),
              TextField(
                key: const ValueKey('proje-editor'),
                controller: _denetci,
                minLines: 8,
                maxLines: 20,
                maxLength: KodProjesi.dosyaEnCokKarakter,
                keyboardType: TextInputType.multiline,
                autocorrect: false,
                enableSuggestions: false,
                style: KodKutusu.stil(context)?.copyWith(fontSize: 14),
                decoration: InputDecoration(
                  labelText: p.dosyalar[_secili].ad,
                  alignLabelWithHint: true,
                ),
                // Hedefler, boyut ve önizleme yazdıkça güncellenir.
                onChanged: (_) => setState(() {
                  _alanEsitle();
                  _degisti = true;
                }),
              ),
              Text(
                '${_degisti ? 'Kaydedilmemiş değişiklik · ' : ''}'
                'Boyut: ${p.boyut} karakter',
                style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
              ),
              const SizedBox(height: Olcu.b2),
              Wrap(
                spacing: Olcu.b1,
                runSpacing: Olcu.b1,
                children: [
                  OutlinedButton.icon(
                    key: const ValueKey('proje-onizle'),
                    icon: const Icon(Icons.preview_outlined),
                    label: const Text('Önizle'),
                    onPressed: () {
                      _alanEsitle();
                      setState(
                        () => _alt = _alt == _Alt.onizleme
                            ? _Alt.yok
                            : _Alt.onizleme,
                      );
                    },
                  ),
                  OutlinedButton.icon(
                    key: const ValueKey('proje-konsol'),
                    icon: const Icon(Icons.terminal),
                    label: const Text('JS\'i konsolda çalıştır'),
                    onPressed: _calisiyor ? null : _konsoldaCalistir,
                  ),
                  OutlinedButton.icon(
                    key: const ValueKey('proje-kopyala'),
                    icon: const Icon(Icons.copy),
                    label: const Text('HTML\'i kopyala'),
                    onPressed: _kopyala,
                  ),
                  OutlinedButton.icon(
                    key: const ValueKey('proje-dosyaya'),
                    icon: const Icon(Icons.download_outlined),
                    label: const Text('Dosyaya kaydet'),
                    onPressed: _dosyayaKaydet,
                  ),
                ],
              ),
              const SizedBox(height: Olcu.b2),
              if (_alt == _Alt.onizleme) _Onizleme(proje: _proje!),
              if (_alt == _Alt.konsol) _konsolBolumu(yazi, r),
            ],
          ),
        ),
      ),
    );
  }

  Widget _konsolBolumu(TextTheme yazi, AdimRenkleri r) {
    final s = _konsol;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Konsol', style: yazi.labelLarge),
        Text(
          'Yalnız JS dosyaları çalışır; sayfa (document, window) yoktur.',
          style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
        ),
        const SizedBox(height: 4),
        if (_calisiyor)
          const LinearProgressIndicator()
        else if (s != null)
          KodKutusu(
            key: const ValueKey('proje-konsol-cikti'),
            metin: s.motorYok
                ? 'Bu cihazda JavaScript motoru bulunamadı; kod çalıştırılamadı.'
                : [
                    if (s.cikti.isNotEmpty) s.cikti,
                    if (s.hata != null) '⚠ ${s.hata}',
                    if (s.cikti.isEmpty && s.hata == null) '(çıktı yok)',
                  ].join('\n'),
          ),
      ],
    );
  }
}

/// Basit önizleme: yapı ve metin (WebView yok, CSS/JS uygulanmaz).
class _Onizleme extends StatelessWidget {
  const _Onizleme({required this.proje});
  final KodProjesi proje;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final ogeler = KodProjeleri.onizleme(KodProjeleri.tekHtml(proje));
    return Container(
      key: const ValueKey('proje-onizleme'),
      width: double.infinity,
      padding: const EdgeInsets.all(Olcu.b2),
      decoration: BoxDecoration(
        color: r.yuzey,
        borderRadius: BorderRadius.circular(Olcu.kose),
        border: Border.all(color: r.kenar),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Basit önizleme: yalnız yapı ve metin. CSS ve JavaScript '
            'uygulanmaz; gerçek görünüm için dosyaya kaydedip tarayıcıda aç.',
            style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
          ),
          const Divider(),
          if (ogeler.isEmpty) const Text('(gösterilecek içerik yok)'),
          for (final o in ogeler) _oge(o, yazi, r),
        ],
      ),
    );
  }

  Widget _oge(OnizlemeOgesi o, TextTheme yazi, AdimRenkleri r) {
    Widget simgeli(IconData s, String metin) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Icon(s, size: 18, color: r.metinIkincil),
          const SizedBox(width: Olcu.b1),
          Expanded(child: Text(metin, style: yazi.bodyMedium)),
        ],
      ),
    );
    return switch (o.tur) {
      OnizlemeTuru.sekme => simgeli(Icons.tab, 'Sekme başlığı: ${o.metin}'),
      OnizlemeTuru.baslik => Padding(
        padding: const EdgeInsets.only(top: Olcu.b1, bottom: 4),
        child: Text(
          o.metin,
          style: switch (o.duzey) {
            1 => yazi.headlineSmall,
            2 => yazi.titleLarge,
            _ => yazi.titleMedium,
          },
        ),
      ),
      OnizlemeTuru.paragraf => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Text(o.metin, style: yazi.bodyMedium),
      ),
      OnizlemeTuru.madde => simgeli(Icons.circle, o.metin),
      OnizlemeTuru.satir => simgeli(Icons.table_rows_outlined, o.metin),
      OnizlemeTuru.dugme => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: OutlinedButton(onPressed: null, child: Text(o.metin)),
      ),
      OnizlemeTuru.gorsel => simgeli(
        Icons.image_outlined,
        'Görsel: ${o.metin}',
      ),
      OnizlemeTuru.girdi => simgeli(Icons.input, 'Girdi alanı: ${o.metin}'),
    };
  }
}

class _DosyaAdiPenceresi extends StatefulWidget {
  const _DosyaAdiPenceresi({
    this.baslik = 'Yeni dosya',
    this.ilk = '',
    this.etiket = 'Dosya adı (ör. oyun.js)',
    this.enCok = 29,
  });
  final String baslik;
  final String ilk;
  final String etiket;
  final int enCok;

  @override
  State<_DosyaAdiPenceresi> createState() => _DosyaAdiPenceresiDurumu();
}

class _DosyaAdiPenceresiDurumu extends State<_DosyaAdiPenceresi> {
  late final _d = TextEditingController(text: widget.ilk);

  @override
  void dispose() {
    _d.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: Text(widget.baslik),
    content: TextField(
      key: const ValueKey('ad-alani'),
      controller: _d,
      autofocus: true,
      maxLength: widget.enCok,
      decoration: InputDecoration(labelText: widget.etiket),
      onSubmitted: (v) => Navigator.pop(context, v),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Vazgeç'),
      ),
      FilledButton(
        onPressed: () => Navigator.pop(context, _d.text),
        child: const Text('Tamam'),
      ),
    ],
  );
}
