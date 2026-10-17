import cairosvg, io, sys, struct
from PIL import Image
for ad in ['dosya-donusturucu','adim-adim','dinamik-qr']:
    s=f'{ad}/ikon.svg'
    cairosvg.svg2png(url=s,write_to=f'{ad}/ikon-512.png',output_width=512,output_height=512)
    cairosvg.svg2png(url=s,write_to=f'{ad}/ikon-1024.png',output_width=1024,output_height=1024)
    im=Image.open(f'{ad}/ikon-1024.png').convert('RGBA')
    im.save(f'{ad}/ikon.ico',sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
    im.save(f'{ad}/ikon.icns',format='ICNS')
    # Android mipmap
    for n,sz in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
        import os; os.makedirs(f'{ad}/android/mipmap-{n}',exist_ok=True)
        im.resize((sz,sz),Image.LANCZOS).save(f'{ad}/android/mipmap-{n}/ic_launcher.png')
