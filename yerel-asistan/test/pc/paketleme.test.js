'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const afterPack = require('../../pc/scripts/after-pack');

const PC = path.join(__dirname, '..', '..', 'pc');
const pkg = JSON.parse(fs.readFileSync(path.join(PC, 'package.json'), 'utf8'));

// Gerçek paket kurulu olmasa da çalışsın diye sahte @electron/fuses
const SAHTE = {
  FuseVersion: { V1: 1 },
  FuseV1Options: { RunAsNode: 0, EnableCookieEncryption: 1, EnableNodeOptionsEnvironmentVariable: 2, EnableNodeCliInspectArguments: 3, EnableEmbeddedAsarIntegrityValidation: 4, OnlyLoadAppFromAsar: 5 }
};

test('afterPack: fuse seçenekleri tam olarak istenen güvenlik ayarlarıdır', () => {
  const s = afterPack.fuseSecenekleri(SAHTE);
  assert.deepStrictEqual(s, { version: 1, 0: false, 2: false, 3: false, 4: true, 5: true });
});

test('afterPack: win32 exe yolunu bulur ve flipFuses çağırır; diğer platform/eksik bilgi reddedilir', async () => {
  const cagri = [];
  const ctx = { electronPlatformName: 'win32', appOutDir: path.join('/c', 'win-unpacked'), packager: { appInfo: { productFilename: 'Pırıl' } } };
  const yol = await afterPack(ctx, { fuses: SAHTE, flipFuses: async (y, s) => { cagri.push([y, s]); } });
  assert.strictEqual(yol, path.join('/c', 'win-unpacked', 'Pırıl.exe'));
  assert.strictEqual(cagri.length, 1);
  assert.strictEqual(cagri[0][0], yol);
  assert.strictEqual(cagri[0][1][0], false);
  assert.strictEqual(afterPack.default, afterPack);
  await assert.rejects(afterPack({ ...ctx, electronPlatformName: 'linux' }, { fuses: SAHTE, flipFuses: async () => {} }), /win32/);
  await assert.rejects(afterPack({ electronPlatformName: 'win32' }, { fuses: SAHTE, flipFuses: async () => {} }), /eksik/);
  await assert.rejects(afterPack(ctx, { fuses: SAHTE, flipFuses: async () => { throw new Error('flip'); } }), /flip/);
});

test('afterPack kaynağı: yalnız istenen beş fuse ayarlanır', () => {
  const k = fs.readFileSync(path.join(PC, 'scripts', 'after-pack.js'), 'utf8');
  for (const [ad, deger] of [['RunAsNode', 'false'], ['EnableNodeOptionsEnvironmentVariable', 'false'], ['EnableNodeCliInspectArguments', 'false'],
    ['EnableEmbeddedAsarIntegrityValidation', 'true'], ['OnlyLoadAppFromAsar', 'true']]) {
    assert.match(k, new RegExp('\\[FuseV1Options\\.' + ad + '\\]: ' + deger));
  }
  assert.strictEqual((k.match(/\[FuseV1Options\./g) || []).length, 5);
});

test('pc/package.json: @electron/fuses sabit sürümlü devDependency, afterPack bağlı, asar açık', () => {
  assert.match(pkg.devDependencies['@electron/fuses'], /^\d+\.\d+\.\d+$/);
  for (const [ad, s] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) assert.match(s, /^\d+\.\d+\.\d+$/, ad);
  assert.strictEqual(pkg.build.afterPack, 'scripts/after-pack.js');
  assert.ok(fs.existsSync(path.join(PC, pkg.build.afterPack)));
  assert.strictEqual(pkg.build.asar, true);
});

test('pc/package.json build.files: main.js\'in yerel require ettiği tüm modüller pakete girer', () => {
  const dosyalar = new Set(pkg.build.files);
  for (const dosya of ['main.js', 'cekirdek-kopru.js', 'onay.js', 'eslestirme.js']) {
    const kaynak = fs.readFileSync(path.join(PC, dosya), 'utf8');
    for (const m of kaynak.matchAll(/require\('\.\/([a-z-]+)'\)/g)) {
      assert.ok(dosyalar.has(m[1] + '.js'), dosya + ' -> ' + m[1] + '.js build.files içinde değil');
    }
    assert.ok(dosyalar.has(dosya), dosya);
  }
});
