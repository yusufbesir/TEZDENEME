'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { kucukHarf, aksanSil, normallestir, sayiyaCevir } = require('../../cekirdek/turkce');

test('küçük harf: İ ve I doğru', () => {
  assert.equal(kucukHarf('İSTANBUL'), 'istanbul');
  assert.equal(kucukHarf('IŞIK'), 'ışık');
  assert.equal(kucukHarf('İzmir'), 'izmir');
});

test('aksan toleransı', () => {
  assert.equal(aksanSil('Çağrı şöyle ığdır üzüm'), 'cagri soyle igdir uzum');
  assert.equal(normallestir('SAAT KAÇ?'), normallestir('saat kac'));
});

test('yazıyla sayı rakama', () => {
  assert.equal(normallestir('beş dakika'), '5 dakika');
  assert.equal(normallestir('yarım saat'), '0.5 saat');
  assert.equal(normallestir('bir buçuk saat'), '1.5 saat');
  assert.equal(normallestir('on iki çarpı yedi'), '12 carpi 7');
  assert.equal(normallestir('yüz yirmi üç'), '123');
  assert.equal(normallestir('iki bin yirmi altı'), '2026');
  assert.equal(normallestir('iki yüz bin'), '200000');
  assert.equal(normallestir('bir iki'), '1 2');
  assert.equal(sayiyaCevir('beş'), 5);
  assert.equal(sayiyaCevir('yirmi beş'), 25);
  assert.equal(sayiyaCevir('yarım'), 0.5);
  assert.ok(Number.isNaN(sayiyaCevir('merhaba')));
});

test('kesme işareti ve ondalık virgül', () => {
  assert.equal(normallestir("yarın 9'da"), 'yarin 9 da');
  assert.equal(normallestir('3,5 artı 2'), '3.5 arti 2');
});
