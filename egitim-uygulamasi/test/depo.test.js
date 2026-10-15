const test=require('node:test');
const assert=require('node:assert/strict');
const Motor=require('../js/motor.js');
const Depo=require('../js/depo.js');

const KEY='adimadim.durum.v1';
function sahte(){
  const m=new Map();
  return {m,getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>{m.delete(k);}};
}
test.beforeEach(()=>{globalThis.localStorage=sahte();});
test.after(()=>{delete globalThis.localStorage;});

test('boş depoda yeni durum',()=>{
  assert.deepEqual(Depo.yukle(),Motor.yeniDurum());
});

test('kaydet / yukle gidiş dönüş, doğru anahtar',()=>{
  let d=Motor.dersBitir(Motor.yeniDurum(),'ing#1',8,10,'2026-05-01');
  d=Motor.kartIsle(d,'ing#1#0',true,'2026-05-01');
  assert.equal(Depo.kaydet(d),true);
  assert.ok(localStorage.m.has(KEY));
  assert.deepEqual(Depo.yukle(),d);
});

test('sifirla veriyi siler',()=>{
  Depo.kaydet(Motor.dersBitir(Motor.yeniDurum(),'a',1,1,'2026-05-01'));
  Depo.sifirla();
  assert.equal(localStorage.m.has(KEY),false);
  assert.deepEqual(Depo.yukle(),Motor.yeniDurum());
});

test('bozuk veri: geçersiz JSON, null, dizi, sayı, metin',()=>{
  for(const ham of ['{bozuk','null','[]','42','"x"','']){
    localStorage.setItem(KEY,ham);
    assert.deepEqual(Depo.yukle(),Motor.yeniDurum(),'ham='+ham);
  }
});

test('bozuk alanlar varsayılana döner, geçerli olanlar korunur',()=>{
  localStorage.setItem(KEY,JSON.stringify({
    xp:'çok',seri:-3,enSeri:7,sonGun:5,kartlar:{a:{kutu:9,sonraki:'x'},b:{kutu:2,sonraki:'2026-01-02'},c:null},
    tamamlanan:[],gunlukXp:{'2026-01-01':10,'2026-01-02':'x'}
  }));
  const d=Depo.yukle();
  assert.equal(d.xp,0);assert.equal(d.seri,0);assert.equal(d.enSeri,7);assert.equal(d.sonGun,null);
  assert.deepEqual(d.kartlar,{b:{kutu:2,sonraki:'2026-01-02'}});
  assert.deepEqual(d.tamamlanan,{});
  assert.deepEqual(d.gunlukXp,{'2026-01-01':10});
});

test('localStorage hata fırlatırsa patlamaz',()=>{
  globalThis.localStorage={getItem(){throw new Error('x');},setItem(){throw new Error('dolu');},removeItem(){throw new Error('x');}};
  assert.deepEqual(Depo.yukle(),Motor.yeniDurum());
  assert.equal(Depo.kaydet(Motor.yeniDurum()),false);
  assert.doesNotThrow(()=>Depo.sifirla());
});

test('localStorage hiç yoksa patlamaz',()=>{
  delete globalThis.localStorage;
  assert.deepEqual(Depo.yukle(),Motor.yeniDurum());
  assert.equal(Depo.kaydet(Motor.yeniDurum()),false);
  assert.doesNotThrow(()=>Depo.sifirla());
});
