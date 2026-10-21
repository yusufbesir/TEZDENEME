import 'package:flutter/material.dart';

import '../../tema/tema.dart';

/// Tek seçimli seçenek listesi (Secim, Bosluk, Dinle, Kod ortak kullanır).
/// Kontrol sonrası: doğru seçenek onay simgesi, yanlış seçilen çarpı simgesi alır.
class SecenekListesi extends StatelessWidget {
  const SecenekListesi({
    super.key,
    required this.secenekler,
    required this.secili,
    required this.dogru,
    required this.kontrolEdildi,
    required this.onSec,
    this.monospace = false,
  });

  final List<String> secenekler;
  final int? secili;
  final int dogru;
  final bool kontrolEdildi;
  final ValueChanged<int> onSec;
  final bool monospace;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return Column(
      children: [
        for (var i = 0; i < secenekler.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: Olcu.b1),
            child: _satir(context, r, yazi, i),
          ),
      ],
    );
  }

  Widget _satir(BuildContext context, AdimRenkleri r, TextTheme yazi, int i) {
    final seciliMi = secili == i;
    final dogruSecenek = kontrolEdildi && i == dogru;
    final yanlisSecili = kontrolEdildi && seciliMi && i != dogru;
    final kenar = dogruSecenek
        ? r.dogru
        : yanlisSecili
        ? r.hata
        : seciliMi
        ? r.ana
        : r.kenar;
    IconData simge = seciliMi
        ? Icons.radio_button_checked
        : Icons.radio_button_unchecked;
    Color simgeRenk = seciliMi ? r.ana : r.metinIkincil;
    String durumMetni = seciliMi ? 'seçili' : '';
    if (dogruSecenek) {
      simge = Icons.check_circle;
      simgeRenk = r.dogru;
      durumMetni = 'doğru cevap';
    } else if (yanlisSecili) {
      simge = Icons.cancel;
      simgeRenk = r.hata;
      durumMetni = 'yanlış seçim';
    }
    return Semantics(
      button: true,
      selected: seciliMi,
      enabled: !kontrolEdildi,
      label: '${secenekler[i]}${durumMetni.isEmpty ? '' : ', $durumMetni'}',
      excludeSemantics: true,
      onTap: kontrolEdildi ? null : () => onSec(i),
      child: AnimatedContainer(
        duration: Olcu.sure(context, 150),
        decoration: BoxDecoration(
          color: seciliMi ? r.yuzey : r.zemin,
          borderRadius: BorderRadius.circular(Olcu.kose),
          border: Border.all(
            color: kenar,
            width: seciliMi || dogruSecenek ? 2 : 1,
          ),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(Olcu.kose),
          onTap: kontrolEdildi ? null : () => onSec(i),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 56),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: Olcu.b2,
                vertical: Olcu.b1,
              ),
              child: Row(
                children: [
                  Icon(simge, color: simgeRenk),
                  const SizedBox(width: Olcu.b2),
                  Expanded(
                    child: Text(
                      secenekler[i],
                      style: monospace
                          ? yazi.bodyLarge?.copyWith(fontFamily: yaziKod)
                          : yazi.bodyLarge,
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
}
