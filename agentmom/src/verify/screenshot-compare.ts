// Sahip: Claude [İP:AgentMom madde 52]; yalnız yazan yapay zeka değiştirir.
// Görsel regresyon (madde 52) için SAYFA İÇİNDE çalışan piksel karşılaştırma işlevi. PNG çözmek için bağımlılık yoktur: tarayıcının kendi görüntü çözücüsü
// (Image + canvas getImageData) kullanılır. browser-worker.ts işlevi BOŞ bir about:blank sayfasında (site betikleri çalışmayan ayrı bağlamda) Playwright'a verir;
// işlev kendi kendine yeter (kaynak metni sayfaya serileştirilir) ve ağa çıkmaz: iki görüntü data URL olarak verilir.
// Kural: boyutlar eşit değilse fark vardır (oran 1); aksi halde herhangi bir kanalı `tol` değerinden (0..255) fazla ayrışan piksel "farklı"dır. Fark görüntüsü: aynı piksel
// kırmızı, diğerleri soluklaştırılmış yeni görüntü.
declare const document: any;
declare const Image: any;

export interface CompareOptions {
  // Taban ve yeni görüntü: ham base64 (data: öneki YOK).
  baseline: string;
  current: string;
  tol: number;
}

export interface CompareResult {
  sizeMismatch: boolean;
  baselineSize: { width: number; height: number };
  currentSize: { width: number; height: number };
  totalPixels: number;
  diffPixels: number;
  ratio: number;
  // Kırmızı işaretli fark görüntüsü (ham base64 PNG); boyut uyuşmazlığında null.
  diffPng: string | null;
}

export async function compareImages(o: CompareOptions): Promise<CompareResult> {
  const load = (b64: string): Promise<any> =>
    new Promise((ok, fail) => {
      const im = new Image();
      im.onload = () => ok(im);
      im.onerror = () => fail(new Error("image could not be decoded"));
      im.src = "data:image/png;base64," + b64;
    });
  const a = await load(o.baseline);
  const b = await load(o.current);
  const baselineSize = { width: a.naturalWidth, height: a.naturalHeight };
  const currentSize = { width: b.naturalWidth, height: b.naturalHeight };
  if (baselineSize.width !== currentSize.width || baselineSize.height !== currentSize.height || baselineSize.width === 0 || baselineSize.height === 0) {
    return { sizeMismatch: true, baselineSize, currentSize, totalPixels: 0, diffPixels: 0, ratio: 1, diffPng: null };
  }
  const w = baselineSize.width;
  const h = baselineSize.height;
  const read = (im: any): any => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(im, 0, 0);
    return ctx.getImageData(0, 0, w, h).data;
  };
  const da = read(a);
  const db = read(b);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d");
  const img = octx.createImageData(w, h);
  const px = img.data;
  let diffPixels = 0;
  for (let i = 0; i < da.length; i += 4) {
    const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]), Math.abs(da[i + 3] - db[i + 3]));
    if (d > o.tol) {
      diffPixels++;
      px[i] = 255;
      px[i + 1] = 0;
      px[i + 2] = 0;
      px[i + 3] = 255;
    } else {
      px[i] = Math.round(db[i] * 0.4 + 153);
      px[i + 1] = Math.round(db[i + 1] * 0.4 + 153);
      px[i + 2] = Math.round(db[i + 2] * 0.4 + 153);
      px[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  const url: string = out.toDataURL("image/png");
  const totalPixels = w * h;
  return { sizeMismatch: false, baselineSize, currentSize, totalPixels, diffPixels, ratio: diffPixels / totalPixels, diffPng: diffPixels > 0 ? url.slice(url.indexOf(",") + 1) : null };
}
