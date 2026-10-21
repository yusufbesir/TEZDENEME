// build/icon.png (256x256) dosyasını pc/ikon.js çizimiyle üretir. Kullanım: node scripts/ikon-uret.js
const fs = require('fs');
const path = require('path');
const { png } = require('../ikon');
const hedef = path.join(__dirname, '..', 'build', 'icon.png');
fs.mkdirSync(path.dirname(hedef), { recursive: true });
fs.writeFileSync(hedef, png(256, false));
console.log('Yazildi: ' + hedef);
