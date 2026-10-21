// cekirdek/, protokol/ ve arayuz/ klasörlerini pc/ altına kopyalar (paketleme tek klasörden yapılır).
// protokol/node_modules ve test dosyaları kopyalanmaz (ws, pc/package.json bağımlılığı olarak kurulur).
const fs = require('fs');
const path = require('path');
const kok = path.join(__dirname, '..', '..');
const pc = path.join(__dirname, '..');
const HARIC = new Set(['node_modules', 'test', 'package-lock.json', '.git']);

function kopyala(kaynak, hedef) {
  const st = fs.lstatSync(kaynak);
  if (st.isSymbolicLink()) return; // sembolik bağlar izlenmez
  if (st.isDirectory()) {
    fs.mkdirSync(hedef, { recursive: true });
    fs.readdirSync(kaynak).filter((a) => !HARIC.has(a)).forEach((a) => kopyala(path.join(kaynak, a), path.join(hedef, a)));
  } else if (st.isFile()) {
    fs.copyFileSync(kaynak, hedef);
  }
}
let eksik = false;
['cekirdek', 'protokol', 'arayuz'].forEach((k) => {
  const kaynak = path.join(kok, k);
  if (!fs.existsSync(kaynak)) { console.error('Kaynak klasor yok: ' + kaynak); eksik = true; return; }
  const hedef = path.join(pc, k);
  fs.rmSync(hedef, { recursive: true, force: true }); // yalnız pc/ altındaki eski kopya
  kopyala(kaynak, hedef);
  console.log('Kopyalandi: ' + k);
});
if (!fs.existsSync(path.join(pc, 'build', 'icon.png'))) require('./ikon-uret');
if (eksik) process.exit(1);
