'use strict';
// `node --test test/pc/` (klasör argümanı) Node 22'de klasörü modül olarak çalıştırır; bu dosya klasördeki testleri yükler.
const fs = require('fs');
const path = require('path');
fs.readdirSync(__dirname).filter((a) => /\.test\.js$/.test(a)).sort().forEach((a) => require(path.join(__dirname, a)));
