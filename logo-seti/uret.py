"""Logo setini üretir: python3 uret.py  (Pillow + cairosvg). Kaynak çizimler SANAT sözlüğünde."""
import cairosvg, os
from PIL import Image

# Sanat 512x512 tuvalde, görünür alan 96..416 içinde (güvenli bölge). Tek fikir, 2-3 renk, ince çizgi yok.
SANAT = {
 # Belge siluetinin içinde negatif boşlukla çift yönlü ok: "bir biçimden ötekine".
 'dosya-donusturucu': dict(bg1='#2F7BF5', bg2='#1747A8', art='''
  <path fill="#fff" fill-rule="evenodd" d="M150 96h134l84 84v212a24 24 0 0 1-24 24H150a24 24 0 0 1-24-24V120a24 24 0 0 1 24-24z
   M170 232h110v-26l50 44-50 44v-26H170z M342 330H232v-26l-50 44 50 44v-26h110z"/>
  <path fill="#FFB020" d="M284 96l84 84h-60a24 24 0 0 1-24-24z"/>'''),
 # Basamaklardan kurulan "A": merdiven hem yükselir hem iner, ortadaki boşluk A'nın kapısı. Tepede güneş.
 'adim-adim': dict(bg1='#FFA63D', bg2='#F26B1D', art='''
  <path fill="#fff" fill-rule="evenodd" d="M96 416V352h64v-64h64v-64h64v64h64v64h64v64z M224 416v-64h64v64z"/>
  <path fill="#fff" d="M224 224h64v-64h-64z" opacity="0"/>
  <path d="M256 224V116" stroke="#fff" stroke-width="16" stroke-linecap="round"/><path d="M264 120l64 26-64 26z" fill="#FFE08A"/>'''),
 # Dalga halkası: sürekli yenilenen (dinamik) QR. Ortada QR modülleri, çevresinde dönen çift ok.
 'dinamik-qr': dict(bg1='#13294B', bg2='#0B1830', art='''
  <g fill="#22D3A6"><rect x="196" y="196" width="52" height="52" rx="10"/><rect x="264" y="196" width="52" height="52" rx="10"/><rect x="196" y="264" width="52" height="52" rx="10"/></g>
  <rect x="264" y="264" width="52" height="52" rx="10" fill="#fff"/>
  <g fill="none" stroke="#fff" stroke-width="30" stroke-linecap="round"><path d="M120 256A136 136 0 0 1 345 153"/><path d="M392 256A136 136 0 0 1 167 359"/></g>
  <path fill="#F4C430" d="M394 195L381 113L310 194z"/><path fill="#F4C430" d="M118 317L131 399L202 318z"/>'''),
}

def svg(ad, kare=False, on_plan=True, olcek=1.0):
    d = SANAT[ad]
    bg = '' if not on_plan else (f'<rect width="512" height="512" rx="{0 if kare else 112}" fill="url(#g)"/>')
    art = f'<g transform="translate(256 256) scale({olcek}) translate(-256 -256)">{d["art"]}</g>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="{ad}">'
            f'<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{d["bg1"]}"/>'
            f'<stop offset="1" stop-color="{d["bg2"]}"/></linearGradient></defs>{bg}{art}</svg>')

for ad, d in SANAT.items():
    os.makedirs(ad, exist_ok=True)
    open(f'{ad}/ikon.svg', 'w').write(svg(ad))
    open(f'{ad}/ikon-tam-kare.svg', 'w').write(svg(ad, kare=True))        # iOS/mağaza: köşe yuvarlama yok
    open(f'{ad}/android-on-plan.svg', 'w').write(svg(ad, on_plan=False, olcek=0.72))  # adaptive foreground
    open(f'{ad}/android-arka-plan.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="{d["bg1"]}"/></svg>')
    for n in (512, 1024):
        cairosvg.svg2png(url=f'{ad}/ikon.svg', write_to=f'{ad}/ikon-{n}.png', output_width=n, output_height=n)
    cairosvg.svg2png(url=f'{ad}/ikon-tam-kare.svg', write_to=f'{ad}/ikon-ios-1024.png', output_width=1024, output_height=1024)
    cairosvg.svg2png(url=f'{ad}/android-on-plan.svg', write_to=f'{ad}/android-on-plan-432.png', output_width=432, output_height=432)
    cairosvg.svg2png(url=f'{ad}/android-arka-plan.svg', write_to=f'{ad}/android-arka-plan-432.png', output_width=432, output_height=432)
    im = Image.open(f'{ad}/ikon-1024.png').convert('RGBA')
    im.save(f'{ad}/ikon.ico', sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
    im.save(f'{ad}/ikon.icns', format='ICNS')
    for n, sz in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
        os.makedirs(f'{ad}/android/mipmap-{n}', exist_ok=True)
        im.resize((sz, sz), Image.LANCZOS).save(f'{ad}/android/mipmap-{n}/ic_launcher.png')
    # küçük boyut testi: 16/32/64
    t = Image.new('RGBA', (16+32+64+40, 70), 'white'); x = 8
    for s in (16, 32, 64):
        t.paste(im.resize((s, s), Image.LANCZOS), (x, 3)); x += s + 8
    t.resize((t.width*3, t.height*3), Image.NEAREST).save(f'/tmp/kucuk-{ad}.png')
