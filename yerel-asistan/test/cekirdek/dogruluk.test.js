'use strict';
// En az 200 örneklik Türkçe doğruluk seti: her söyleyiş beklenen niyete gitmeli. Kalanlar tek tek listelenir.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { calistir, ctxYap } = require('./yardimci');

const SET = JSON.parse(fs.readFileSync(path.join(__dirname, 'dogruluk-seti.json'), 'utf8'));

test('doğruluk seti (en az 200 örnek)', async () => {
  assert.ok(SET.length >= 200, 'set en az 200 örnek olmalı');
  const kalan = [];
  for (const [metin, niyet] of SET) {
    const r = await calistir(metin, ctxYap());
    if (r.niyet !== niyet) kalan.push(`"${metin}" beklenen=${niyet} gelen=${r.niyet}`);
  }
  assert.deepEqual(kalan, [], `${kalan.length} örnek kaldı:\n` + kalan.join('\n'));
});
