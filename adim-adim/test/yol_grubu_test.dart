// Yol sekmesi kurs grubu seçici: gruplama, süzme ve çip davranışı.
// Sahibi: Yusuf (yusufbesir); yazan: [İP:Adım Adım özellikler#cihaz] Claude
// Yalnız onu yazan yapay zekâ değiştirir; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
import 'package:adim_adim/ekranlar/yol_grubu.dart';
import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

List<Kurs> alan(KursAlani a) => [
  for (final k in tumKurslar)
    if (k.alan == a) k,
];

void main() {
  test('dil alanında İngilizce dışındaki diller de gruplanır', () {
    final g = kursGruplari(alan(KursAlani.dil));
    expect(
      g,
      containsAll(['ingilizce', 'almanca', 'fransizca', 'korece', 'japonca']),
    );
    expect(g.toSet().length, g.length);
  });

  test('kod alanında HTML, Python, SQL, PHP, Go da var', () {
    final g = kursGruplari(alan(KursAlani.kod));
    expect(g, containsAll(['html', 'css', 'js', 'python', 'sql', 'php', 'go']));
  });

  test('grupKurslari süzer; seçim yoksa ya da yabancıysa hepsi', () {
    final dil = alan(KursAlani.dil);
    final al = grupKurslari(dil, 'almanca');
    expect(al, isNotEmpty);
    expect(al.every((k) => kursGrubu(k) == 'almanca'), isTrue);
    expect(grupKurslari(dil, null), dil);
    expect(grupKurslari(dil, 'python'), dil);
  });

  test('grupAdi bilinen adları Türkçe yazar', () {
    expect(grupAdi('fransizca'), 'Fransızca');
    expect(grupAdi('js'), 'JavaScript');
    expect(grupAdi('xyz'), 'Xyz');
  });

  testWidgets('çip seçince provider güncellenir; tek grup çizilmez', (t) async {
    final dil = alan(KursAlani.dil);
    await t.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          home: Scaffold(body: YolGrubuSecici(kurslar: dil)),
        ),
      ),
    );
    expect(find.text('Almanca'), findsOneWidget);
    await t.tap(find.byKey(const ValueKey('yol-grup-almanca')));
    await t.pump();
    final c = ProviderScope.containerOf(t.element(find.byType(YolGrubuSecici)));
    expect(c.read(yolGrubuProvider), 'almanca');
    await t.tap(find.byKey(const ValueKey('yol-grup-tumu')));
    await t.pump();
    expect(c.read(yolGrubuProvider), isNull);

    await t.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          home: Scaffold(body: YolGrubuSecici(kurslar: [dil.first])),
        ),
      ),
    );
    expect(find.byType(ChoiceChip), findsNothing);
  });
}
