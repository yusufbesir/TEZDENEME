'use strict';
// electron-builder afterPack: Electron "fuse"larını paketlenmiş exe üzerinde ayarlar (@electron/fuses).
// - RunAsNode kapalı: ELECTRON_RUN_AS_NODE ile exe'nin Node yorumlayıcısı olarak kötüye kullanımı engellenir.
// - EnableNodeOptionsEnvironmentVariable kapalı: NODE_OPTIONS ile kod enjeksiyonu engellenir.
// - EnableNodeCliInspectArguments kapalı: --inspect / --inspect-brk bayrakları çalışmaz.
// - EnableEmbeddedAsarIntegrityValidation açık: app.asar içeriği değiştirilmişse uygulama açılmaz.
// - OnlyLoadAppFromAsar açık: uygulama yalnızca app.asar'dan yüklenir (yan klasör "app/" ile değiştirilemez).
// NOT: Bu, kod imzası DEĞİLDİR. Uygulama imzasızdır (bkz. MIMARI.md).
const path = require('path');

function fuseSecenekleri(fuses) {
  const { FuseVersion, FuseV1Options } = fuses;
  return {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true
  };
}

// Paketlenmiş Electron ikilisinin yolu. Yalnız Windows paketi desteklenir (bu proje --win üretir).
function ikiliYolu(context) {
  const platform = context && context.electronPlatformName;
  if (platform !== 'win32') throw new Error('after-pack: yalnız win32 desteklenir (alınan: ' + platform + ')');
  const ad = context.packager && context.packager.appInfo && context.packager.appInfo.productFilename;
  if (typeof ad !== 'string' || !ad || !context.appOutDir) throw new Error('after-pack: paket bilgisi eksik');
  return path.join(context.appOutDir, ad + '.exe');
}

// fuses ve flipFuses enjekte edilebilir (test); varsayılan gerçek @electron/fuses.
async function afterPack(context, enjekte) {
  const e = enjekte || {};
  const fuses = e.fuses || require('@electron/fuses');
  const flip = e.flipFuses || fuses.flipFuses;
  const yol = ikiliYolu(context);
  await flip(yol, fuseSecenekleri(fuses));
  return yol;
}

module.exports = afterPack;
module.exports.default = afterPack;
module.exports.fuseSecenekleri = fuseSecenekleri;
module.exports.ikiliYolu = ikiliYolu;
