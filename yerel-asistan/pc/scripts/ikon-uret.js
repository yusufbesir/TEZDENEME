// build/icon.png dosyasını logo/ikon-256.png'den kopyalar (kurulum ve pencere simgesi). Kullanım: node scripts/ikon-uret.js
// Tepsi simgesi ayrıdır: pc/ikon.js piksel çizimi (uzaktan kontrol açıkken uyarı rengi).
const fs = require('fs');
const path = require('path');
const kaynak = path.join(__dirname, '..', '..', 'logo', 'ikon-256.png');
const hedef = path.join(__dirname, '..', 'build', 'icon.png');
fs.mkdirSync(path.dirname(hedef), { recursive: true });
fs.copyFileSync(kaynak, hedef);
console.log('Kopyalandi: ' + kaynak + ' -> ' + hedef);
