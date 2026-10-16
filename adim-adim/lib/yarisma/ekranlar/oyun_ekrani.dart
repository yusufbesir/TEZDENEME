/// Yarışma oyun ekranı: çark, soru, taç seçimi ve sonuç aşamalarının arayüzü.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Kurallar `YarismaMotoru`ndadır (bu dosya yalnızca gösterir ve yönlendirir).
/// Tüm animasyonlar `Olcu.sure` ile ≤250 ms; tek istisna çark (1.200 ms).
/// Oyun bitince sonuç bir kez kaydedilir: `yarismaKayitProvider.oyunuIsle` ve
/// `durumProvider.yarismaBitir`. Çıkışta (X) puan kaydedilmez.
/// Yerleşim esnektir: taç ızgarası en çok 240 px'lik hücrelerle akar, kategori
/// adı iki satıra kadar sarılır.
library;

import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../bilesenler/sayfa_govdesi.dart';
import '../../durum/saglayicilar.dart';
import '../../tema/kategori_renkleri.dart';
import '../../tema/tema.dart';
import '../model.dart';
import '../motor.dart';
import '../saglayicilar.dart';
import '../soru_bankasi.dart';
import 'bilesenler/cark.dart';
import 'bilesenler/sik_dugmesi.dart';
import 'bilesenler/sure_cubugu.dart';
import 'bilesenler/tac.dart';
import 'sonuc_gorunumu.dart';

/// Kesinleşmiş son cevabın geri bildirimi.
class _Cevap {
  const _Cevap({
    required this.soru,
    required this.secilen,
    required this.dogru,
    required this.tacMi,
  });

  final YarismaSorusu soru;

  /// Seçilen şık; süre dolduysa null.
  final int? secilen;
  final bool dogru;
  final bool tacMi;
}

class YarismaOyunEkrani extends ConsumerStatefulWidget {
  const YarismaOyunEkrani({
    super.key,
    required this.alan,
    required this.kursId,
    this.motor,
  });

  /// 'dil' | 'kod'.
  final String alan;

  /// Seviye (kurs) kimliği, ör. 'ingilizce-1'.
  final String kursId;

  /// Testte sabit tohumlu motor verilir; verilmezse gerçek rastgelelik.
  final YarismaMotoru? motor;

  @override
  ConsumerState<YarismaOyunEkrani> createState() => _YarismaOyunDurumu();
}

class _YarismaOyunDurumu extends ConsumerState<YarismaOyunEkrani> {
  late final YarismaMotoru _motor = widget.motor ?? YarismaMotoru();
  YarismaOyunu? _oyun;
  String? _hata;

  // Çark aşaması.
  YarismaOyunu? _bekleyen; // çark durunca geçilecek oyun durumu
  int? _hedefDilim;
  int _donusNo = 0;
  bool _donuyor = false;
  bool _afis = false;
  Timer? _afisSayaci;

  // Soru aşaması.
  _Cevap? _cevap;
  bool _hakMesaji = false;

  bool _kaydedildi = false;

  @override
  void initState() {
    super.initState();
    _yeniOyun();
  }

  @override
  void dispose() {
    _afisSayaci?.cancel();
    super.dispose();
  }

  void _yeniOyun() {
    _afisSayaci?.cancel();
    _bekleyen = null;
    _hedefDilim = null;
    _donuyor = false;
    _afis = false;
    _cevap = null;
    _hakMesaji = false;
    _kaydedildi = false;
    try {
      _oyun = _motor.basla(sorulariBul(widget.alan, widget.kursId));
      _hata = null;
    } on ArgumentError {
      _oyun = null;
      _hata = 'Bu seviye için yeterli soru yok.';
    }
  }

  bool get _hareketAzalt =>
      MediaQuery.maybeDisableAnimationsOf(context) == true;

  bool get _sonucMu => _oyun != null && _oyun!.bittiMi && _cevap == null;

  // --- çark ---

  void _cevir() {
    final o = _oyun;
    if (o == null || _donuyor) return;
    final r = _motor.carkCevir(o);
    if (r.dilim < 0) return;
    setState(() {
      _bekleyen = r.oyun;
      _hedefDilim = r.dilim;
      _donusNo++;
      _donuyor = true;
      _afis = false;
    });
  }

  void _carkBitti() {
    if (!mounted || _bekleyen == null) return;
    if (_hareketAzalt) {
      _carkSonrasi();
      return;
    }
    // Kategori adı kısa süre büyük yazılır, sonra soruya geçilir.
    setState(() => _afis = true);
    _afisSayaci?.cancel();
    _afisSayaci = Timer(const Duration(milliseconds: 700), _carkSonrasi);
  }

  void _carkSonrasi() {
    if (!mounted || _bekleyen == null) return;
    setState(() {
      _oyun = _bekleyen;
      _bekleyen = null;
      _donuyor = false;
      _afis = false;
    });
  }

  // --- soru ---

  void _sikSec(int i) {
    final o = _oyun;
    if (o == null || _cevap != null) return;
    if (o.asama != YarismaAsama.soruda &&
        o.asama != YarismaAsama.tacSorusunda) {
      return;
    }
    final yeni = _motor.cevapla(o, i);
    if (identical(yeni, o)) return;
    final kesin = yeni.cevapGecmisi.length > o.cevapGecmisi.length;
    setState(() {
      _oyun = yeni;
      if (kesin) {
        _hakMesaji = false;
        _cevap = _Cevap(
          soru: o.mevcutSoru!,
          secilen: i,
          dogru: yeni.cevapGecmisi.last.dogru,
          tacMi: o.asama == YarismaAsama.tacSorusunda,
        );
      } else {
        // Çift şans yanlışı kurtardı: soru sürer.
        _hakMesaji = true;
      }
    });
  }

  void _sureBitti() {
    final o = _oyun;
    if (!mounted || o == null || _cevap != null) return;
    if (o.asama != YarismaAsama.soruda &&
        o.asama != YarismaAsama.tacSorusunda) {
      return;
    }
    final yeni = _motor.sureBitti(o);
    if (identical(yeni, o)) return;
    setState(() {
      _oyun = yeni;
      _hakMesaji = false;
      _cevap = _Cevap(
        soru: o.mevcutSoru!,
        secilen: null,
        dogru: false,
        tacMi: o.asama == YarismaAsama.tacSorusunda,
      );
    });
  }

  void _guc(YarismaOyunu Function(YarismaOyunu) uygula) {
    final o = _oyun;
    if (o == null || _cevap != null) return;
    final yeni = uygula(o);
    if (identical(yeni, o)) return;
    setState(() {
      _oyun = yeni;
      _hakMesaji = false;
    });
  }

  void _devam() {
    setState(() {
      _cevap = null;
      _hakMesaji = false;
    });
    final o = _oyun;
    if (o != null && o.bittiMi) _sonucuKaydet(o);
  }

  void _tacKategorisiSec(YarismaKategori k) {
    final o = _oyun;
    if (o == null) return;
    final yeni = _motor.tacKategoriSec(o, k);
    if (identical(yeni, o)) return;
    setState(() {
      _oyun = yeni;
      _hakMesaji = false;
    });
  }

  // --- kayıt ve çıkış ---

  /// Sonuç gösterilirken BİR KEZ: istatistik kaydı ve ana duruma XP.
  void _sonucuKaydet(YarismaOyunu oyun) {
    if (_kaydedildi) return;
    _kaydedildi = true;
    final kayitHazir = ref.read(yarismaKayitProvider.future);
    final durumHazir = ref.read(durumProvider.future);
    final kayit = ref.read(yarismaKayitProvider.notifier);
    final durum = ref.read(durumProvider.notifier);
    final alan = widget.alan;
    final kursId = widget.kursId;
    unawaited(() async {
      // Yüklenmeden yazılırsa eski kayıt ezilirdi: önce yüklemeyi bekle.
      try {
        await kayitHazir;
        await kayit.oyunuIsle(alan, kursId, oyun);
      } catch (_) {}
      try {
        await durumHazir;
        await durum.yarismaBitir(oyun.puan);
      } catch (_) {}
    }());
  }

  Future<void> _cikisSor() async {
    final onay = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Oyundan çıkılsın mı?'),
        content: const Text('Puan kaydedilmez.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(c).pop(false),
            child: const Text('Devam et'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(c).pop(true),
            child: const Text('Çık'),
          ),
        ],
      ),
    );
    if (onay == true && mounted) Navigator.of(context).pop();
  }

  void _kapat() {
    if (_sonucMu || _oyun == null) {
      Navigator.of(context).pop();
    } else {
      _cikisSor();
    }
  }

  // --- arayüz ---

  @override
  Widget build(BuildContext context) {
    final o = _oyun;
    return PopScope(
      canPop: _sonucMu || o == null,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _cikisSor();
      },
      child: Scaffold(
        body: SafeArea(
          child: SayfaGovdesi(
            child: Column(
              children: [
                _ustSatir(o),
                Expanded(child: _icerik(o)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _ustSatir(YarismaOyunu? o) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final kapat = IconButton(
      tooltip: 'Çık',
      icon: const Icon(Icons.close),
      onPressed: _kapat,
    );
    if (o == null || _sonucMu) {
      return Align(alignment: Alignment.centerLeft, child: kapat);
    }
    return Column(
      children: [
        Row(
          children: [
            kapat,
            Semantics(
              container: true,
              label: '${o.can} can',
              child: ExcludeSemantics(
                child: Row(
                  children: [
                    for (var i = 0; i < YarismaMotoru.baslangicCan; i++)
                      Icon(
                        i < o.can ? Icons.favorite : Icons.favorite_border,
                        color: i < o.can ? r.hata : r.kenar,
                      ),
                  ],
                ),
              ),
            ),
            const Spacer(),
            Padding(
              padding: const EdgeInsets.only(right: Olcu.b2),
              child: Text('Puan ${o.puan}', style: yazi.titleMedium),
            ),
          ],
        ),
        TacSirasi(taclar: o.taclar),
        const SizedBox(height: Olcu.b1),
      ],
    );
  }

  Widget _icerik(YarismaOyunu? o) {
    if (o == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(Olcu.b3),
          child: Text(
            _hata ?? 'Oyun başlatılamadı.',
            style: Theme.of(context).textTheme.bodyLarge,
            textAlign: TextAlign.center,
          ),
        ),
      );
    }
    if (_cevap != null) return _soruGorunumu(o);
    if (o.bittiMi) {
      return SonucGorunumu(
        oyun: o,
        onTekrar: () => setState(_yeniOyun),
        onLobi: () => Navigator.of(context).pop(),
      );
    }
    return switch (o.asama) {
      YarismaAsama.carkBekliyor => _carkGorunumu(),
      YarismaAsama.tacKategoriSec => _tacSecimi(o),
      _ => _soruGorunumu(o),
    };
  }

  // --- çark aşaması ---

  Widget _carkGorunumu() {
    final yazi = Theme.of(context).textTheme;
    final dilim = _hedefDilim;
    final tacMi = dilim == YarismaMotoru.tacDilimi;
    final kategori = (dilim != null && !tacMi)
        ? YarismaKategori.values[dilim]
        : null;
    final boyut = (MediaQuery.sizeOf(context).shortestSide - 64).clamp(
      180.0,
      320.0,
    );
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Cark(
              hedefDilim: _hedefDilim,
              donusNo: _donusNo,
              onBitti: _carkBitti,
              boyut: boyut,
            ),
            const SizedBox(height: Olcu.b3),
            ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 72),
              child: Center(
                child: _afis
                    ? TweenAnimationBuilder<double>(
                        tween: Tween(begin: 0, end: 1),
                        duration: Olcu.sure(context),
                        builder: (context, t, child) =>
                            Transform.scale(scale: t, child: child),
                        child: Semantics(
                          liveRegion: true,
                          child: Text(
                            tacMi ? 'Taç!' : kategori!.ad,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.center,
                            style: yazi.headlineLarge,
                          ),
                        ),
                      )
                    : FilledButton(
                        onPressed: _donuyor ? null : _cevir,
                        child: const Text('Çevir'),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- taç kategorisi seçimi ---

  Widget _tacSecimi(YarismaOyunu o) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final parlaklik = Theme.of(context).brightness;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(Olcu.b2),
      child: Column(
        children: [
          Icon(tacSimgesi, size: 48, color: r.vurgu),
          const SizedBox(height: Olcu.b1),
          Semantics(
            header: true,
            liveRegion: true,
            child: Text(
              'Taç sorusu! Kategori seç',
              textAlign: TextAlign.center,
              style: yazi.headlineSmall,
            ),
          ),
          const SizedBox(height: Olcu.b2),
          GridView(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
              maxCrossAxisExtent: 240,
              mainAxisSpacing: Olcu.b1,
              crossAxisSpacing: Olcu.b1,
              // Hücre yüksekliği metin ölçeğiyle büyür (iki satır ad sığar).
              mainAxisExtent: math.max(
                Olcu.hedef + Olcu.b2,
                MediaQuery.textScalerOf(context).scale(14) * 1.5 * 2 + Olcu.b2,
              ),
            ),
            children: [
              for (final k in YarismaKategori.values)
                _tacKategoriDugmesi(
                  k,
                  alindi: o.taclar.contains(k),
                  renk: KategoriRenkleri.renk(k, parlaklik),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _tacKategoriDugmesi(
    YarismaKategori k, {
    required bool alindi,
    required Color renk,
  }) {
    final ust = KategoriRenkleri.ustRenk(Theme.of(context).brightness);
    final yazi = Theme.of(context).textTheme;
    return Semantics(
      button: true,
      enabled: !alindi,
      label: alindi ? '${k.ad}, taç alındı' : '${k.ad} kategorisini seç',
      excludeSemantics: true,
      onTap: alindi ? null : () => _tacKategorisiSec(k),
      child: Opacity(
        opacity: alindi ? 0.4 : 1,
        child: Material(
          color: renk,
          borderRadius: BorderRadius.circular(Olcu.kose),
          child: InkWell(
            key: ValueKey('tac-${k.kimlik}'),
            borderRadius: BorderRadius.circular(Olcu.kose),
            onTap: alindi ? null : () => _tacKategorisiSec(k),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: Olcu.b2),
              child: Row(
                children: [
                  Icon(
                    alindi ? tacSimgesi : KategoriRenkleri.simge(k),
                    color: ust,
                  ),
                  const SizedBox(width: Olcu.b1),
                  Expanded(
                    child: Text(
                      k.ad,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: yazi.titleSmall?.copyWith(
                        color: ust,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // --- soru aşaması ---

  Widget _soruGorunumu(YarismaOyunu o) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final cevap = _cevap;
    final soru = cevap?.soru ?? o.mevcutSoru!;
    final tacMi = cevap?.tacMi ?? (o.asama == YarismaAsama.tacSorusunda);
    final cevaplandi = cevap != null;

    SikDurumu sikDurumu(int i) {
      if (cevap == null) {
        return o.silinenSikler.contains(i)
            ? SikDurumu.silindi
            : SikDurumu.normal;
      }
      if (i == soru.dogru) return SikDurumu.dogru;
      if (i == cevap.secilen) return SikDurumu.yanlisSecilen;
      return o.silinenSikler.contains(i) ? SikDurumu.silindi : SikDurumu.soluk;
    }

    return Column(
      children: [
        _kategoriBandi(soru.kategori, tacMi),
        Padding(
          padding: const EdgeInsets.fromLTRB(
            Olcu.b2,
            Olcu.b2,
            Olcu.b2,
            Olcu.b1,
          ),
          child: SureCubugu(
            key: ValueKey('sure-${soru.id}-$tacMi'),
            toplam: o.sureSaniye,
            calisiyor: !cevaplandi,
            onBitti: _sureBitti,
          ),
        ),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(Olcu.b2),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Semantics(
                  header: true,
                  child: Text(soru.soru, style: yazi.titleLarge),
                ),
                const SizedBox(height: Olcu.b2),
                for (var i = 0; i < 4; i++) ...[
                  SikDugmesi(
                    key: ValueKey('sik-$i'),
                    harf: String.fromCharCode(65 + i),
                    metin: soru.secenekler[i],
                    durum: sikDurumu(i),
                    onTap: cevaplandi ? null : () => _sikSec(i),
                  ),
                  const SizedBox(height: Olcu.b1),
                ],
                if (_hakMesaji && !cevaplandi)
                  Semantics(
                    liveRegion: true,
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: Olcu.b1),
                      child: Text(
                        'Bir hakkın daha var',
                        style: yazi.titleSmall?.copyWith(color: r.vurgu),
                      ),
                    ),
                  )
                else if (o.ciftSansAktif && !cevaplandi)
                  Padding(
                    padding: const EdgeInsets.only(bottom: Olcu.b1),
                    child: Text(
                      'Çift şans açık: yanlışta bir hakkın daha var',
                      style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                    ),
                  ),
                if (cevaplandi)
                  _geriBildirim(cevap, soru)
                else
                  _guclendiriciler(o),
              ],
            ),
          ),
        ),
        if (cevaplandi)
          Padding(
            padding: const EdgeInsets.fromLTRB(
              Olcu.b2,
              Olcu.b1,
              Olcu.b2,
              Olcu.b2,
            ),
            child: SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _devam,
                child: const Text('Devam'),
              ),
            ),
          ),
      ],
    );
  }

  Widget _kategoriBandi(YarismaKategori k, bool tacMi) {
    final parlaklik = Theme.of(context).brightness;
    final ust = KategoriRenkleri.ustRenk(parlaklik);
    final yazi = Theme.of(context).textTheme;
    final stil = yazi.titleMedium?.copyWith(
      color: ust,
      fontWeight: FontWeight.w800,
    );
    return Semantics(
      container: true,
      header: true,
      label: tacMi ? 'Taç sorusu, ${k.ad}' : 'Kategori: ${k.ad}',
      child: ExcludeSemantics(
        child: Container(
          width: double.infinity,
          color: KategoriRenkleri.renk(k, parlaklik),
          padding: const EdgeInsets.symmetric(
            horizontal: Olcu.b2,
            vertical: Olcu.b1,
          ),
          child: Row(
            children: [
              if (tacMi) ...[
                Icon(tacSimgesi, color: ust),
                const SizedBox(width: Olcu.b1),
                Text('TAÇ SORUSU', style: stil),
                const Spacer(),
              ],
              Icon(KategoriRenkleri.simge(k), color: ust),
              const SizedBox(width: Olcu.b1),
              Text(k.ad, style: stil),
            ],
          ),
        ),
      ),
    );
  }

  Widget _guclendiriciler(YarismaOyunu o) {
    final g = o.guclendiriciler;
    final bos = o.buSorudaGucKullanildi;
    Widget dugme(
      String anahtar,
      IconData simge,
      String etiket,
      String ipucu,
      bool kalan,
      YarismaOyunu Function(YarismaOyunu) uygula,
    ) => Semantics(
      hint: kalan ? ipucu : '$ipucu. Kullanılamaz.',
      child: OutlinedButton.icon(
        key: ValueKey('guc-$anahtar'),
        onPressed: (kalan && !bos) ? () => _guc(uygula) : null,
        icon: Icon(simge),
        label: Text(etiket),
      ),
    );
    return Padding(
      padding: const EdgeInsets.only(top: Olcu.b1),
      child: Wrap(
        spacing: Olcu.b1,
        runSpacing: Olcu.b1,
        children: [
          dugme(
            'bomba',
            Icons.remove_circle_outline,
            'Bomba',
            'İki yanlış şıkkı siler',
            g.bomba,
            _motor.bombaKullan,
          ),
          dugme(
            'cift-sans',
            Icons.looks_two_outlined,
            'Çift Şans',
            'Yanlış cevapta bir hak daha verir',
            g.ciftSans,
            _motor.ciftSansKullan,
          ),
          dugme(
            'ekstra-sure',
            Icons.more_time,
            '+15 s',
            '15 saniye ekler',
            g.ekstraSure,
            _motor.ekstraSureKullan,
          ),
          dugme(
            'gec',
            Icons.skip_next,
            'Geç',
            'Soruyu değiştirir',
            g.gec,
            _motor.gecKullan,
          ),
        ],
      ),
    );
  }

  Widget _geriBildirim(_Cevap cevap, YarismaSorusu soru) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final baslik = cevap.dogru
        ? 'Doğru!'
        : cevap.secilen == null
        ? 'Süre doldu'
        : 'Yanlış';
    final renk = cevap.dogru ? r.dogru : r.hata;
    return Semantics(
      liveRegion: true,
      container: true,
      child: Container(
        width: double.infinity,
        margin: const EdgeInsets.only(top: Olcu.b1),
        padding: const EdgeInsets.all(Olcu.b2),
        decoration: BoxDecoration(
          color: r.yuzey,
          borderRadius: BorderRadius.circular(Olcu.kose),
          border: Border.all(color: renk, width: 2),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  cevap.dogru ? Icons.check_circle : Icons.info_outline,
                  color: renk,
                ),
                const SizedBox(width: Olcu.b1),
                Text(baslik, style: yazi.titleMedium?.copyWith(color: renk)),
              ],
            ),
            if (cevap.dogru && cevap.tacMi) ...[
              const SizedBox(height: Olcu.b1),
              TacKazanimi(kategori: soru.kategori),
            ],
            if (!cevap.dogru) ...[
              const SizedBox(height: 4),
              Text(
                'Doğru cevap: ${soru.secenekler[soru.dogru]}',
                style: yazi.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              if (cevap.tacMi)
                Text(
                  'Taç sorusunda can gitmez.',
                  style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                ),
            ],
            const SizedBox(height: Olcu.b1),
            Text('Neden?', style: yazi.titleSmall),
            const SizedBox(height: 2),
            Text(soru.aciklama, style: yazi.bodyMedium),
          ],
        ),
      ),
    );
  }
}
