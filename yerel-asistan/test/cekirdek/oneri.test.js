'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const O = require('../../cekirdek/oneri');
const beceriler = require('../../cekirdek/beceriler');
const { calistir, ctxYap } = require('./yardimci');

test('oneriBul: yakın örnek bulur, uzakta null döner', () => {
  assert.equal(O.oneriBul('hava durumu', beceriler).ad, 'web-ara');
  assert.equal(O.oneriBul('hatırlatıcıları göstersene', beceriler).ad, 'hatirlatici');
  assert.equal(O.oneriBul('asdf qwer', beceriler), null);
  assert.equal(O.oneriBul('', beceriler), null);
});

test('"Şunu mu demek istedin?" yanıtı ve eylemi', async () => {
  const r = await calistir('hava durumu', ctxYap());
  assert.equal(r.niyet, 'oneri');
  assert.match(r.yanit, /^Şunu mu demek istedin: “.+”\?$/);
  assert.equal(r.eylem.tip, 'oneri');
  assert.equal(typeof r.eylem.metin, 'string');
  const tekrar = await calistir(r.eylem.metin, ctxYap());
  assert.equal(tekrar.niyet, 'web-ara');
});

test('anlaşılmayınca üç farklı beceriden örnek', async () => {
  const r = await calistir('pizza sipariş et', ctxYap());
  assert.equal(r.niyet, 'bilinmiyor');
  const ornekler = r.yanit.match(/“[^”]+”/g);
  assert.equal(ornekler.length, 3);
  assert.equal(new Set(ornekler).size, 3);
  const yakin = await calistir('sesi biraz yükseltsene lütfen ya', ctxYap());
  if (yakin.niyet === 'bilinmiyor') assert.match(yakin.yanit, /sesi/);
});

test('eşik: tek ortak belirteç öneri yapmaz, örnek listeler', async () => {
  const r = await calistir('terminali aç', ctxYap());
  assert.equal(r.niyet, 'bilinmiyor');
  assert.match(r.yanit, /aç”/);
});
