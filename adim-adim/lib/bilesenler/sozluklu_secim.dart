/// Metin seçerek sözlükte aç (ÖZELLİK 81, Oxford/WordReference/Livio): alt
/// ağaçtaki seçilebilir metinde bir kelime ya da ifade seçilince bağlam
/// menüsüne "Sözlükte ara" eklenir; `/sozluk?q=<metin>` açılır. Yalnız seçim
/// menüsüne bir madde ekler; metni değiştirmez, ağ isteği yoktur.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class SozlukluSecim extends StatefulWidget {
  const SozlukluSecim({super.key, required this.child});
  final Widget child;

  /// Seçilen metinden sözlük sorgusu: boşluklar teke indirilir; boşsa ya da
  /// [enCok] karakterden uzunsa (cümle/paragraf) null.
  static const int enCok = 60;
  static String? sorguMetni(String? secim) {
    final t = (secim ?? '').replaceAll(RegExp(r'\s+'), ' ').trim();
    if (t.isEmpty || t.length > enCok) return null;
    return t;
  }

  /// Sözlük açılış adresi.
  static String rota(String sorgu) =>
      '/sozluk?q=${Uri.encodeQueryComponent(sorgu)}';

  @override
  State<SozlukluSecim> createState() => _SozlukluSecimDurumu();
}

class _SozlukluSecimDurumu extends State<SozlukluSecim> {
  String _secili = '';

  @override
  Widget build(BuildContext context) {
    return SelectionArea(
      onSelectionChanged: (c) => _secili = c?.plainText ?? '',
      contextMenuBuilder: (context, durum) {
        final ogeler = [...durum.contextMenuButtonItems];
        final sorgu = SozlukluSecim.sorguMetni(_secili);
        if (sorgu != null) {
          ogeler.insert(
            0,
            ContextMenuButtonItem(
              label: 'Sözlükte ara',
              onPressed: () {
                durum.hideToolbar();
                context.push(SozlukluSecim.rota(sorgu));
              },
            ),
          );
        }
        return AdaptiveTextSelectionToolbar.buttonItems(
          anchors: durum.contextMenuAnchors,
          buttonItems: ogeler,
        );
      },
      child: widget.child,
    );
  }
}
