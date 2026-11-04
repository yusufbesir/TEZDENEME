/// Dikte alıştırması (ders içi, cümle düzeyi): Dinle'nin normal/yavaş ses
/// düğmeleri + Yaz'ın metin girişi. Kontrol sonrası yanlışsa kelime farkı
/// satırı (eksik / fazla kelimeler, [Motor.dikteFarki]) gösterilir.
/// Okuma dili: alıştırmanın `sesDili`; yoksa alıştırmanın bulunduğu kursun
/// dili (DersOgeleri.kursSesDili); kurs bulunamazsa varsayılan.
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// yazan: [Claude#dikte]
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../durum/saglayicilar.dart';
import '../../model/icerik.dart';
import '../../motor/ders_ogeleri.dart';
import '../../motor/motor.dart';
import '../../tema/tema.dart';
import 'soru_basligi.dart';

class DikteGorunumu extends ConsumerStatefulWidget {
  const DikteGorunumu({
    super.key,
    required this.alistirma,
    required this.kontrolEdildi,
    required this.dogruMu,
    required this.onCevap,
    required this.onGonder,
  });
  final Dikte alistirma;
  final bool kontrolEdildi;
  final bool dogruMu;
  final ValueChanged<Object?> onCevap;
  final VoidCallback onGonder;

  @override
  ConsumerState<DikteGorunumu> createState() => _DikteDurumu();
}

class _DikteDurumu extends ConsumerState<DikteGorunumu> {
  final _denetci = TextEditingController();
  bool _sesHatasi = false;

  @override
  void dispose() {
    _denetci.dispose();
    super.dispose();
  }

  /// Okuma dili: `sesDili` yoksa alıştırmayı içeren kursun dili.
  String _dil() {
    final a = widget.alistirma;
    final ozel = a.sesDili;
    if (ozel != null) return ozel;
    for (final k in ref.read(kurslarProvider)) {
      for (final d in k.tumDersler) {
        if (d.alistirmalar.any((x) => identical(x, a))) {
          return DersOgeleri.kursSesDili(k.id);
        }
      }
    }
    return varsayilanSesDili;
  }

  Future<void> _oku({bool yavas = false}) async {
    final ses = ref.read(sesProvider);
    final metin = widget.alistirma.metin;
    final dil = _dil();
    final tamam = yavas
        ? await ses.okuYavas(metin, dil: dil)
        : await ses.oku(metin, dil: dil);
    if (!tamam && mounted && !_sesHatasi) setState(() => _sesHatasi = true);
  }

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final sesAcik = ref.watch(durumProvider).value?.sesAcik ?? true;
    final a = widget.alistirma;
    final kontrol = widget.kontrolEdildi;
    // Ses kapalıyken ya da ses servisi çalışmıyorsa düğmeler pasif; cümle yazıyla gösterilir.
    final dugmeAktif = sesAcik && !_sesHatasi;
    final fark = kontrol && !widget.dogruMu
        ? Motor.dikteFarkMetni(Motor.dikteFarki(a.metin, _denetci.text))
        : '';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SoruBasligi(a.soru),
        Center(
          child: Padding(
            padding: const EdgeInsets.only(bottom: Olcu.b3),
            child: Column(
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    _SesDugmesi(
                      anahtar: const Key('dikte-normal'),
                      etiket: 'Cümleyi dinle',
                      gorunenEtiket: 'Normal',
                      simge: Icons.volume_up,
                      boyut: 96,
                      aktif: dugmeAktif,
                      onBas: _oku,
                    ),
                    const SizedBox(width: Olcu.b3),
                    _SesDugmesi(
                      anahtar: const Key('dikte-yavas'),
                      etiket: 'Cümleyi yavaş dinle',
                      gorunenEtiket: 'Yavaş',
                      simge: Icons.slow_motion_video,
                      boyut: 64,
                      aktif: dugmeAktif,
                      onBas: () => _oku(yavas: true),
                    ),
                  ],
                ),
                const SizedBox(height: Olcu.b1),
                Text(
                  sesAcik ? 'Dinle, sonra cümleyi yaz' : 'Ses kapalı',
                  style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                ),
                if (_sesHatasi && sesAcik) ...[
                  const SizedBox(height: Olcu.b1),
                  Text(
                    'Ses kullanılamıyor; cümle yazılı gösterildi',
                    style: yazi.bodyMedium?.copyWith(color: r.hata),
                  ),
                ],
                if (!sesAcik || _sesHatasi) ...[
                  const SizedBox(height: Olcu.b1),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.volume_off, color: r.vurgu, size: 20),
                      const SizedBox(width: Olcu.b1),
                      Flexible(
                        child: Text(
                          'Okunacak cümle: ${a.metin}',
                          style: yazi.bodyLarge,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
        TextField(
          key: const Key('dikte-giris'),
          controller: _denetci,
          readOnly: kontrol,
          maxLength: 200,
          textInputAction: TextInputAction.done,
          autocorrect: false,
          enableSuggestions: false,
          decoration: InputDecoration(
            labelText: 'Duyduğun cümleyi yaz',
            counterText: '',
            suffixIcon: kontrol
                ? Icon(
                    widget.dogruMu ? Icons.check_circle : Icons.cancel,
                    color: widget.dogruMu ? r.dogru : r.hata,
                  )
                : null,
            enabledBorder: kontrol
                ? OutlineInputBorder(
                    borderRadius: BorderRadius.circular(Olcu.kose),
                    borderSide: BorderSide(
                      color: widget.dogruMu ? r.dogru : r.hata,
                      width: 2,
                    ),
                  )
                : null,
          ),
          onChanged: (v) => widget.onCevap(v.trim().isEmpty ? null : v),
          onSubmitted: (v) {
            if (!kontrol && v.trim().isNotEmpty) widget.onGonder();
          },
        ),
        if (fark.isNotEmpty) ...[
          const SizedBox(height: Olcu.b1),
          Semantics(
            label: 'Kelime farkı: $fark',
            excludeSemantics: true,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.difference_outlined, size: 20, color: r.hata),
                const SizedBox(width: Olcu.b1),
                Expanded(
                  child: Text(
                    fark,
                    key: const Key('dikte-fark'),
                    style: yazi.bodyMedium?.copyWith(color: r.hata),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

/// Yuvarlak ses düğmesi + altında görünür etiket ("Normal" / "Yavaş").
class _SesDugmesi extends StatelessWidget {
  const _SesDugmesi({
    required this.anahtar,
    required this.etiket,
    required this.gorunenEtiket,
    required this.simge,
    required this.boyut,
    required this.aktif,
    required this.onBas,
  });

  final Key anahtar;
  final String etiket;
  final String gorunenEtiket;
  final IconData simge;
  final double boyut;
  final bool aktif;
  final VoidCallback onBas;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Semantics(
          button: true,
          enabled: aktif,
          label: etiket,
          excludeSemantics: true,
          onTap: aktif ? onBas : null,
          child: SizedBox(
            width: boyut,
            height: boyut,
            child: FilledButton(
              key: anahtar,
              onPressed: aktif ? onBas : null,
              style: FilledButton.styleFrom(
                shape: const CircleBorder(),
                minimumSize: Size(boyut, boyut),
                padding: EdgeInsets.zero,
              ),
              child: Icon(simge, size: boyut * 0.42),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          gorunenEtiket,
          style: Theme.of(
            context,
          ).textTheme.labelLarge?.copyWith(color: r.metinIkincil),
        ),
      ],
    );
  }
}
