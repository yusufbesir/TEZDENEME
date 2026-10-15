(function(k,f){if(typeof module==='object'&&module.exports)module.exports=f();else k.Motor=f()})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  var ARALIKLAR=[1,2,4,8,16];
  var TARIH=/^(\d{4})-(\d{2})-(\d{2})$/;

  function kopya(x){return JSON.parse(JSON.stringify(x));}
  function sayi(x){return typeof x==='number'&&isFinite(x)?x:0;}

  // 'YYYY-MM-DD' -> gün numarası (UTC, saat dilimi/yaz saati etkisiz); geçersizse null
  function gunNo(s){
    var m=typeof s==='string'?TARIH.exec(s):null;
    if(!m)return null;
    var y=+m[1],a=+m[2],g=+m[3];
    var t=Date.UTC(y,a-1,g);
    var d=new Date(t);
    if(d.getUTCFullYear()!==y||d.getUTCMonth()!==a-1||d.getUTCDate()!==g)return null;
    return Math.round(t/86400000);
  }
  function gunEkle(s,n){
    var d=new Date((gunNo(s)+n)*86400000);
    var p=function(v,u){v=String(v);while(v.length<u)v='0'+v;return v;};
    return p(d.getUTCFullYear(),4)+'-'+p(d.getUTCMonth()+1,2)+'-'+p(d.getUTCDate(),2);
  }

  function yeniDurum(){
    return {xp:0,seri:0,enSeri:0,sonGun:null,kartlar:{},tamamlanan:{},gunlukXp:{}};
  }

  // Seviye n'i bitirmek için gereken XP: 100 + 25*(n-1)
  function seviyeGereken(no){return 100+25*(no-1);}
  function seviye(xp){
    xp=Math.min(1e9,Math.max(0,Math.floor(sayi(xp))));
    var no=1,kalan=xp;
    while(kalan>=seviyeGereken(no)){kalan-=seviyeGereken(no);no++;}
    var s=seviyeGereken(no);
    return {no:no,bu:kalan,sonraki:s,oran:kalan/s};
  }

  function dersBitir(durum,dersKimlik,dogruSayisi,toplam,bugun){
    var d=kopya(durum||yeniDurum());
    var yeni=yeniDurum();
    for(var a in yeni)if(d[a]===undefined||d[a]===null&&a!=='sonGun')d[a]=yeni[a];
    toplam=Math.max(0,Math.floor(sayi(toplam)));
    dogruSayisi=Math.min(toplam,Math.max(0,Math.floor(sayi(dogruSayisi))));
    var xp=10+dogruSayisi*2+(toplam>0&&dogruSayisi===toplam?5:0);
    d.xp=sayi(d.xp)+xp;

    var bg=gunNo(bugun),sg=gunNo(d.sonGun);
    if(bg!==null){
      if(sg!==null&&bg===sg){d.seri=Math.max(1,sayi(d.seri));}
      else if(sg!==null&&bg-sg===1){d.seri=sayi(d.seri)+1;}
      else{d.seri=1;}
      d.sonGun=bugun;
      d.gunlukXp[bugun]=sayi(d.gunlukXp[bugun])+xp;
    }
    d.enSeri=Math.max(sayi(d.enSeri),sayi(d.seri));

    var t=d.tamamlanan[dersKimlik]||{kez:0,enIyi:0};
    d.tamamlanan[dersKimlik]={kez:sayi(t.kez)+1,enIyi:Math.max(sayi(t.enIyi),dogruSayisi)};
    return d;
  }

  function kartIsle(durum,kartId,dogruMu,bugun){
    var d=kopya(durum||yeniDurum());
    if(!d.kartlar||typeof d.kartlar!=='object')d.kartlar={};
    var onceki=d.kartlar[kartId];
    var kutu=onceki&&sayi(onceki.kutu)>=1?Math.min(5,Math.floor(onceki.kutu)):1;
    if(dogruMu)kutu=onceki?Math.min(5,kutu+1):2;
    else kutu=1;
    d.kartlar[kartId]={kutu:kutu,sonraki:gunNo(bugun)===null?bugun:gunEkle(bugun,ARALIKLAR[kutu-1])};
    return d;
  }

  function tekrarBekleyen(durum,bugun){
    var bg=gunNo(bugun);
    if(bg===null||!durum||!durum.kartlar)return [];
    var liste=[];
    Object.keys(durum.kartlar).forEach(function(id){
      var k=durum.kartlar[id];
      var g=k&&gunNo(k.sonraki);
      if(g!==null&&g!==undefined&&g<=bg)liste.push({id:id,g:g});
    });
    liste.sort(function(a,b){return a.g-b.g||(a.id<b.id?-1:a.id>b.id?1:0);});
    return liste.map(function(x){return x.id;});
  }

  // i/ı/İ/I hepsi 'i'; büyük/küçük harf ve fazla boşluk duyarsız
  function norm(s){
    return String(s).normalize('NFC').replace(/[İIı]/g,'i').toLowerCase().replace(/\s+/g,' ').trim();
  }

  function cevapDogruMu(al,cevap){
    if(!al||typeof al!=='object')return false;
    switch(al.tur){
      case 'secim':
      case 'bosluk':
        return Number.isInteger(cevap)&&cevap===al.dogru;
      case 'yaz':
        if(typeof cevap!=='string'||!Array.isArray(al.cevaplar))return false;
        var c=norm(cevap);
        if(c==='')return false;
        return al.cevaplar.some(function(x){return norm(x)===c;});
      case 'sirala':
        return Array.isArray(cevap)&&Array.isArray(al.dogru)&&cevap.length===al.dogru.length&&
          cevap.every(function(x,i){return x===al.dogru[i];});
      case 'eslestir':
        if(!Array.isArray(cevap)||!Array.isArray(al.ciftler)||cevap.length!==al.ciftler.length)return false;
        var anahtar=function(p){return Array.isArray(p)&&p.length===2?JSON.stringify([p[0],p[1]]):null;};
        var dogru=al.ciftler.map(anahtar).sort();
        var verilen=cevap.map(anahtar);
        if(verilen.indexOf(null)!==-1)return false;
        verilen.sort();
        return verilen.every(function(x,i){return x===dogru[i];});
      default:
        return false;
    }
  }

  return {yeniDurum:yeniDurum,seviye:seviye,dersBitir:dersBitir,kartIsle:kartIsle,
    tekrarBekleyen:tekrarBekleyen,cevapDogruMu:cevapDogruMu};
});
