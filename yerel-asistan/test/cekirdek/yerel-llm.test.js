'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { olustur, sunucuDogrula } = require('../../cekirdek/yerel-llm');

test('başarılı yanıt', async () => {
  let gelen;
  const f = async (url, o) => {
    gelen = { url, o };
    return { ok: true, json: async () => ({ message: { content: ' Merhaba ' } }) };
  };
  const llm = olustur({ fetch: f });
  assert.equal(await llm('selam'), 'Merhaba');
  assert.equal(gelen.url, 'http://127.0.0.1:11434/api/chat');
});

test('sunucu beyaz listesi', () => {
  assert.throws(() => olustur({ fetch() {}, sunucu: 'http://evil.com:11434' }));
  assert.throws(() => olustur({ fetch() {}, sunucu: 'https://127.0.0.1:11434' }));
  assert.throws(() => olustur({ fetch() {}, sunucu: 'http://127.0.0.1:8080' }));
  assert.throws(() => olustur({ fetch() {}, sunucu: 'http://localhost:11434' }));
  assert.throws(() => olustur({ fetch() {}, sunucu: 'http://127.0.0.1.evil.com:11434' }));
  assert.equal(sunucuDogrula('http://127.0.0.1:11434'), 'http://127.0.0.1:11434');
});

test('ağ hatası / fetch yok / kötü yanıt -> null', async () => {
  assert.equal(await olustur({ fetch: async () => { throw new Error('ECONNREFUSED'); } })('x'), null);
  assert.equal(await olustur({})('x'), null);
  assert.equal(await olustur({ fetch: async () => ({ ok: false }) })('x'), null);
  assert.equal(await olustur({ fetch: async () => ({ ok: true, json: async () => ({}) }) })('x'), null);
});

test('zaman aşımı abort eder ve null döner', async () => {
  const f = (url, o) => new Promise((_, rej) => o.signal.addEventListener('abort', () => rej(new Error('abort'))));
  const llm = olustur({ fetch: f, zamanAsimiMs: 30 });
  assert.equal(await llm('x'), null);
});
