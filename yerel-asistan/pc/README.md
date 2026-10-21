# Pırıl: Windows uygulaması

Kurulum ve derleme (Windows, Node 22):

```
cd yerel-asistan\pc
npm ci
npm test
npm run dist
```

`npm ci` kullanın: `package-lock.json` sabit sürümleri ve bütünlük özetlerini kilitler (tedarik zinciri güvenliği).
Çıktı: `dist\` altında kurulum exe'si, taşınabilir exe ve SHA256 dosyası. Uygulama kod imzasızdır; SHA256 dosyası yalnız bozulma denetimidir.
