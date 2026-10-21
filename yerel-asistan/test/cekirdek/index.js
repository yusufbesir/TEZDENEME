'use strict';
// `node --test test/cekirdek/` (Node 22) dizini tek dosya gibi çalıştırır; bu giriş tüm testleri yükler.
const fs = require('node:fs');
const path = require('node:path');

for (const f of fs.readdirSync(__dirname).sort()) {
  if (f.endsWith('.test.js')) require(path.join(__dirname, f));
}
