"""Pırıl logo seti: python3 uret.py  (Pillow + cairosvg). Tek fikir: konuşan kıvılcım (balon içinde parıltı).
Renkler arayüzle aynı: turkuaz kontur #1d6f73, koyu #14343a, kıvılcım #f2b84b. Yazı yok, 16 px'te okunur."""
import os, cairosvg
from PIL import Image

KOK = os.path.dirname(os.path.abspath(__file__))
BG1, BG2, BALON, KIVILCIM, KIVILCIM2 = '#2a9a95', '#14343a', '#ffffff', '#f2b84b', '#ffd97a'
# 512 tuval, sanat 96..416 güvenli alanda. Balon: yuvarlak kare + sol altta kuyruk. İçinde dört uçlu kıvılcım + küçük kıvılcım.
ART = f'''
  <path fill="{BALON}" d="M152 112h208a56 56 0 0 1 56 56v152a56 56 0 0 1-56 56H236l-72 60v-60h-12a56 56 0 0 1-56-56V168a56 56 0 0 1 56-56z"/>
  <path fill="{KIVILCIM}" d="M248 148c6 54 24 72 78 78-54 6-72 24-78 78-6-54-24-72-78-78 54-6 72-24 78-78z"/>
  <path fill="{KIVILCIM2}" d="M336 164c3 22 10 29 32 32-22 3-29 10-32 32-3-22-10-29-32-32 22-3 29-10 32-32z"/>'''

def svg(kare=False, on_plan=True, olcek=1.0):
    bg = '' if not on_plan else f'<rect width="512" height="512" rx="{0 if kare else 112}" fill="url(#g)"/>'
    art = f'<g transform="translate(256 256) scale({olcek}) translate(-256 -256)">{ART}</g>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Pırıl">'
            f'<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{BG1}"/>'
            f'<stop offset="1" stop-color="{BG2}"/></linearGradient></defs>{bg}{art}</svg>')

def yaz(ad, icerik):
    open(os.path.join(KOK, ad), 'w').write(icerik)

def png(svg_ad, png_ad, n):
    cairosvg.svg2png(url=os.path.join(KOK, svg_ad), write_to=os.path.join(KOK, png_ad), output_width=n, output_height=n)

yaz('ikon.svg', svg()); yaz('ikon-tam-kare.svg', svg(kare=True))
yaz('android-on-plan.svg', svg(on_plan=False, olcek=0.72))
yaz('android-arka-plan.svg', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="{BG2}"/></svg>')
for n in (256, 512, 1024): png('ikon.svg', f'ikon-{n}.png', n)
png('ikon-tam-kare.svg', 'ikon-ios-1024.png', 1024)
png('android-on-plan.svg', 'android-on-plan-432.png', 432)
png('android-arka-plan.svg', 'android-arka-plan-432.png', 432)
im = Image.open(os.path.join(KOK, 'ikon-1024.png')).convert('RGBA')
im.save(os.path.join(KOK, 'ikon.ico'), sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
im.save(os.path.join(KOK, 'ikon.icns'), format='ICNS')
on_plan = Image.open(os.path.join(KOK, 'android-on-plan-432.png')).convert('RGBA')
# Her yoğunluk: ic_launcher (48dp) + adaptive ön plan (108dp, şeffaf zemin)
for n, sz, on in [('mdpi', 48, 108), ('hdpi', 72, 162), ('xhdpi', 96, 216), ('xxhdpi', 144, 324), ('xxxhdpi', 192, 432)]:
    d = os.path.join(KOK, 'android', f'mipmap-{n}'); os.makedirs(d, exist_ok=True)
    im.resize((sz, sz), Image.LANCZOS).save(os.path.join(d, 'ic_launcher.png'))
    im.resize((sz, sz), Image.LANCZOS).save(os.path.join(d, 'ic_launcher_round.png'))
    on_plan.resize((on, on), Image.LANCZOS).save(os.path.join(d, 'ic_launcher_foreground.png'))
t = Image.new('RGBA', (16 + 32 + 64 + 128 + 48, 136), 'white'); x = 8
for s in (16, 32, 64, 128):
    t.paste(im.resize((s, s), Image.LANCZOS), (x, 4)); x += s + 8
t.resize((t.width * 2, t.height * 2), Image.NEAREST).save(os.path.join(KOK, 'onizleme-kucuk.png'))
print('tamam')
