'use strict';
// Node 22'de `node --test test/protokol/` dizini modül olarak çözer; bu dosya o durumda tüm testleri yükler.
// (Glob ile `test/protokol/*.test.js` çalıştırılırsa bu dosya hiç yüklenmez.)
const fs = require('node:fs');
const path = require('node:path');
for (const f of fs.readdirSync(__dirname).sort()) {
  if (f.endsWith('.test.js')) require(path.join(__dirname, f));
}
