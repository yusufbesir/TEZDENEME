(function(k,f){if(typeof module==='object'&&module.exports)module.exports=f();else k.Depo=f()})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  var ANAHTAR='adimadim.durum.v1';

  function motor(){
    if(typeof Motor!=='undefined')return Motor;
    if(typeof require==='function')return require('./motor.js');
    throw new Error('Motor yok');
  }
  function depolama(){
    try{return typeof localStorage!=='undefined'?localStorage:null;}catch(e){return null;}
  }
  function nesne(x){return x!==null&&typeof x==='object'&&!Array.isArray(x);}
  function sayi(x){return typeof x==='number'&&isFinite(x)&&x>=0?Math.min(x,1e9):null;}

  // Ham veriyi doğrular; geçersiz alanlar varsayılana döner, bozuk kayıtlar atılır
  function temizle(ham){
    var d=motor().yeniDurum();
    if(!nesne(ham))return d;
    ['xp','seri','enSeri'].forEach(function(a){var s=sayi(ham[a]);if(s!==null)d[a]=s;});
    if(typeof ham.sonGun==='string')d.sonGun=ham.sonGun;
    if(nesne(ham.kartlar))Object.keys(ham.kartlar).forEach(function(id){
      if(id==='__proto__')return;
      var c=ham.kartlar[id];
      if(nesne(c)&&Number.isInteger(c.kutu)&&c.kutu>=1&&c.kutu<=5&&typeof c.sonraki==='string')
        d.kartlar[id]={kutu:c.kutu,sonraki:c.sonraki};
    });
    if(nesne(ham.tamamlanan))Object.keys(ham.tamamlanan).forEach(function(id){
      if(id==='__proto__')return;
      var t=ham.tamamlanan[id];
      if(nesne(t))d.tamamlanan[id]=t;
    });
    if(nesne(ham.gunlukXp))Object.keys(ham.gunlukXp).forEach(function(g){
      if(g==='__proto__')return;
      var s=sayi(ham.gunlukXp[g]);if(s!==null)d.gunlukXp[g]=s;
    });
    return d;
  }

  function yukle(){
    try{
      var ls=depolama();
      var m=ls?ls.getItem(ANAHTAR):null;
      if(m===null||m===undefined)return motor().yeniDurum();
      return temizle(JSON.parse(m));
    }catch(e){
      return motor().yeniDurum();
    }
  }
  function kaydet(durum){
    try{
      var ls=depolama();
      if(!ls)return false;
      ls.setItem(ANAHTAR,JSON.stringify(durum));
      return true;
    }catch(e){return false;}
  }
  function sifirla(){
    try{
      var ls=depolama();
      if(ls)ls.removeItem(ANAHTAR);
    }catch(e){}
    return motor().yeniDurum();
  }
  return {yukle:yukle,kaydet:kaydet,sifirla:sifirla,ANAHTAR:ANAHTAR};
});
