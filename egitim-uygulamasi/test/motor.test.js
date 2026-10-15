const test=require('node:test');
const assert=require('node:assert/strict');
const Motor=require('../js/motor.js');

const ders=(d,gun,dogru=5,toplam=10)=>Motor.dersBitir(d,'d1',dogru,toplam,gun);

test('yeniDurum şemaya uyar',()=>{
  assert.deepEqual(Motor.yeniDurum(),{xp:0,seri:0,enSeri:0,sonGun:null,kartlar:{},tamamlanan:{},gunlukXp:{}});
});

test('XP: 10 + doğru*2, tam puana +5',()=>{
  assert.equal(Motor.dersBitir(Motor.yeniDurum(),'a',7,10,'2026-01-01').xp,24);
  assert.equal(Motor.dersBitir(Motor.yeniDurum(),'a',10,10,'2026-01-01').xp,35);
  assert.equal(Motor.dersBitir(Motor.yeniDurum(),'a',0,10,'2026-01-01').xp,10);
  assert.equal(Motor.dersBitir(Motor.yeniDurum(),'a',0,0,'2026-01-01').xp,10);
});

test('XP birikir, gunlukXp ve tamamlanan işlenir',()=>{
  let d=ders(Motor.yeniDurum(),'2026-01-01',10,10);
  d=ders(d,'2026-01-01',5,10);
  assert.equal(d.xp,35+20);
  assert.equal(d.gunlukXp['2026-01-01'],55);
  assert.equal(d.tamamlanan.d1.kez,2);
  assert.equal(d.tamamlanan.d1.enIyi,10);
});

test('seri: ilk ders 1, ertesi gün artar',()=>{
  let d=ders(Motor.yeniDurum(),'2026-03-10');
  assert.equal(d.seri,1);
  d=ders(d,'2026-03-11');
  assert.equal(d.seri,2);
  assert.equal(d.enSeri,2);
  assert.equal(d.sonGun,'2026-03-11');
});

test('seri: aynı gün iki kez artmaz',()=>{
  let d=ders(Motor.yeniDurum(),'2026-03-10');
  d=ders(d,'2026-03-10');
  assert.equal(d.seri,1);
  d=ders(d,'2026-03-11');
  d=ders(d,'2026-03-11');
  assert.equal(d.seri,2);
});

test('seri: boşlukta 1e düşer, enSeri korunur',()=>{
  let d=ders(Motor.yeniDurum(),'2026-03-10');
  d=ders(d,'2026-03-11');
  d=ders(d,'2026-03-12');
  d=ders(d,'2026-03-14');
  assert.equal(d.seri,1);
  assert.equal(d.enSeri,3);
});

test('seri: ay ve yıl geçişi, artık yıl',()=>{
  let d=ders(Motor.yeniDurum(),'2026-01-31');
  d=ders(d,'2026-02-01');
  assert.equal(d.seri,2);
  d=ders(Motor.dersBitir(Motor.yeniDurum(),'x',1,1,'2025-12-31'),'2026-01-01');
  assert.equal(d.seri,2);
  d=ders(Motor.dersBitir(Motor.yeniDurum(),'x',1,1,'2024-02-28'),'2024-02-29');
  assert.equal(d.seri,2);
  d=ders(d,'2024-03-01');
  assert.equal(d.seri,3);
  d=ders(Motor.dersBitir(Motor.yeniDurum(),'x',1,1,'2026-02-28'),'2026-03-01');
  assert.equal(d.seri,2);
  d=ders(Motor.dersBitir(Motor.yeniDurum(),'x',1,1,'2026-02-27'),'2026-03-01');
  assert.equal(d.seri,1);
});

test('seri: geçersiz tarih patlamaz, seri/sonGun değişmez',()=>{
  const d=Motor.dersBitir(Motor.yeniDurum(),'x',1,1,'bozuk');
  assert.equal(d.seri,0);
  const e=ders(ders(Motor.yeniDurum(),'2026-01-01'),'2026-01-02');
  const g=Motor.dersBitir(e,'x',1,1,'2026-13-45');
  assert.equal(g.seri,2);assert.equal(g.sonGun,'2026-01-02');
});

test('seviye',()=>{
  assert.deepEqual(Motor.seviye(0),{no:1,bu:0,sonraki:100,oran:0});
  const s=Motor.seviye(50);
  assert.equal(s.no,1);assert.equal(s.oran,0.5);
  const s2=Motor.seviye(100);
  assert.equal(s2.no,2);assert.equal(s2.bu,0);
  assert.ok(s2.sonraki>100,'sonraki seviye daha fazla XP ister');
  assert.equal(Motor.seviye(-5).no,1);
  assert.equal(Motor.seviye(NaN).no,1);
  let onceki=0;
  for(let xp=0;xp<5000;xp+=7){
    const v=Motor.seviye(xp);
    assert.ok(v.no>=onceki);onceki=v.no;
    assert.ok(v.oran>=0&&v.oran<1);
    assert.ok(v.bu>=0&&v.bu<v.sonraki);
  }
});

test('Leitner: doğru kutuyu artırır, aralıklar 1,2,4,8,16',()=>{
  let d=Motor.kartIsle(Motor.yeniDurum(),'k#0',true,'2026-01-01');
  assert.deepEqual(d.kartlar['k#0'],{kutu:2,sonraki:'2026-01-03'});
  d=Motor.kartIsle(d,'k#0',true,'2026-01-03');
  assert.deepEqual(d.kartlar['k#0'],{kutu:3,sonraki:'2026-01-07'});
  d=Motor.kartIsle(d,'k#0',true,'2026-01-07');
  assert.deepEqual(d.kartlar['k#0'],{kutu:4,sonraki:'2026-01-15'});
  d=Motor.kartIsle(d,'k#0',true,'2026-01-15');
  assert.deepEqual(d.kartlar['k#0'],{kutu:5,sonraki:'2026-01-31'});
  d=Motor.kartIsle(d,'k#0',true,'2026-01-31');
  assert.deepEqual(d.kartlar['k#0'],{kutu:5,sonraki:'2026-02-16'});
});

test('Leitner: yanlış kutu 1e indirir, yarın vade',()=>{
  let d=Motor.kartIsle(Motor.yeniDurum(),'k#0',true,'2026-01-01');
  d=Motor.kartIsle(d,'k#0',false,'2026-01-03');
  assert.deepEqual(d.kartlar['k#0'],{kutu:1,sonraki:'2026-01-04'});
  const y=Motor.kartIsle(Motor.yeniDurum(),'yeni',false,'2026-12-31');
  assert.deepEqual(y.kartlar.yeni,{kutu:1,sonraki:'2027-01-01'});
});

test('tekrarBekleyen: vadesi gelenler, en eski önce',()=>{
  let d=Motor.yeniDurum();
  d.kartlar={a:{kutu:1,sonraki:'2026-01-05'},b:{kutu:2,sonraki:'2026-01-02'},c:{kutu:3,sonraki:'2026-01-10'},d:{kutu:1,sonraki:'2026-01-06'}};
  assert.deepEqual(Motor.tekrarBekleyen(d,'2026-01-06'),['b','a','d']);
  assert.deepEqual(Motor.tekrarBekleyen(d,'2026-01-01'),[]);
  assert.deepEqual(Motor.tekrarBekleyen(d,'2026-02-01'),['b','a','d','c']);
  assert.deepEqual(Motor.tekrarBekleyen(Motor.yeniDurum(),'2026-01-01'),[]);
  assert.deepEqual(Motor.tekrarBekleyen(d,'bozuk'),[]);
});

test('saf fonksiyon: girdi durumu değişmez',()=>{
  const d=ders(Motor.yeniDurum(),'2026-01-01');
  d.kartlar={k:{kutu:2,sonraki:'2026-01-03'}};
  const dondur=JSON.stringify(d);
  Motor.dersBitir(d,'z',3,5,'2026-01-02');
  Motor.kartIsle(d,'k',true,'2026-01-03');
  Motor.kartIsle(d,'yeni',false,'2026-01-03');
  Motor.tekrarBekleyen(d,'2026-01-05');
  assert.equal(JSON.stringify(d),dondur);
  const r=Motor.dersBitir(d,'z',3,5,'2026-01-02');
  assert.notEqual(r,d);assert.notEqual(r.kartlar,d.kartlar);
  const y=Motor.yeniDurum();y.kartlar.x=1;
  assert.deepEqual(Motor.yeniDurum().kartlar,{});
});

test('cevapDogruMu: secim ve bosluk',()=>{
  for(const tur of ['secim','bosluk']){
    const a={tur,soru:'?',secenekler:['a','b','c'],dogru:1};
    assert.equal(Motor.cevapDogruMu(a,1),true);
    assert.equal(Motor.cevapDogruMu(a,0),false);
    assert.equal(Motor.cevapDogruMu(a,'1'),false);
    assert.equal(Motor.cevapDogruMu(a,undefined),false);
  }
  assert.equal(Motor.cevapDogruMu({tur:'secim',dogru:0},0),true);
});

test('cevapDogruMu: yaz (harf/boşluk duyarsız, Türkçe I/İ)',()=>{
  const a={tur:'yaz',soru:'?',cevaplar:['Hello','good  morning']};
  assert.equal(Motor.cevapDogruMu(a,'hello'),true);
  assert.equal(Motor.cevapDogruMu(a,'  HELLO '),true);
  assert.equal(Motor.cevapDogruMu(a,'Good Morning'),true);
  assert.equal(Motor.cevapDogruMu(a,'hell'),false);
  assert.equal(Motor.cevapDogruMu(a,''),false);
  assert.equal(Motor.cevapDogruMu(a,5),false);
  const t={tur:'yaz',cevaplar:['ışık','İstanbul','Işıl','ice']};
  assert.equal(Motor.cevapDogruMu(t,'IŞIK'),true);
  assert.equal(Motor.cevapDogruMu(t,'işik'),true);
  assert.equal(Motor.cevapDogruMu(t,'ISTANBUL'),true);
  assert.equal(Motor.cevapDogruMu(t,'istanbul'),true);
  assert.equal(Motor.cevapDogruMu(t,'ıstanbul'),true);
  assert.equal(Motor.cevapDogruMu(t,'IŞIL'),true);
  assert.equal(Motor.cevapDogruMu(t,'ICE'),true);
  assert.equal(Motor.cevapDogruMu(t,'İCE'),true);
  assert.equal(Motor.cevapDogruMu(t,'ışk'),false);
});

test('cevapDogruMu: sirala',()=>{
  const a={tur:'sirala',kelimeler:['b','a','c'],dogru:['a','b','c']};
  assert.equal(Motor.cevapDogruMu(a,['a','b','c']),true);
  assert.equal(Motor.cevapDogruMu(a,['b','a','c']),false);
  assert.equal(Motor.cevapDogruMu(a,['a','b']),false);
  assert.equal(Motor.cevapDogruMu(a,'abc'),false);
});

test('cevapDogruMu: eslestir (sıradan bağımsız, tam eşleşme)',()=>{
  const a={tur:'eslestir',ciftler:[['cat','kedi'],['dog','köpek'],['bird','kuş']]};
  assert.equal(Motor.cevapDogruMu(a,[['cat','kedi'],['dog','köpek'],['bird','kuş']]),true);
  assert.equal(Motor.cevapDogruMu(a,[['bird','kuş'],['cat','kedi'],['dog','köpek']]),true);
  assert.equal(Motor.cevapDogruMu(a,[['cat','köpek'],['dog','kedi'],['bird','kuş']]),false);
  assert.equal(Motor.cevapDogruMu(a,[['cat','kedi'],['cat','kedi'],['bird','kuş']]),false);
  assert.equal(Motor.cevapDogruMu(a,[['cat','kedi']]),false);
  assert.equal(Motor.cevapDogruMu(a,null),false);
  assert.equal(Motor.cevapDogruMu(a,[['cat'],['dog'],['bird']]),false);
});

test('cevapDogruMu: bilinmeyen tür / boş girdi false',()=>{
  assert.equal(Motor.cevapDogruMu({tur:'x'},0),false);
  assert.equal(Motor.cevapDogruMu(null,0),false);
  assert.equal(Motor.cevapDogruMu(undefined,0),false);
});
