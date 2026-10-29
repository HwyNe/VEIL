#!/usr/bin/env python3
"""Kodla çizilen özgün ikon; dış görsel veya font gerektirmez."""
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[1]
for size in [16, 32, 48, 128, 256, 512]:
    scale = 4
    canvas = Image.new('RGBA', (size*scale, size*scale), (0,0,0,0))
    d = ImageDraw.Draw(canvas)
    def xy(points): return [(int(x*size*scale/128),int(y*size*scale/128)) for x,y in points]
    d.rounded_rectangle((0,0,size*scale-1,size*scale-1), radius=size*scale//4, fill='#1b2925')
    d.polygon(xy([(64,13),(107,30),(107,65),(103,81),(92,96),(79,108),(64,118),(49,108),(36,96),(25,81),(21,65),(21,30)]), fill='#b5f4d6')
    d.line(xy([(43,47),(64,80),(85,47)]), fill='#19382b', width=max(1,int(10*size*scale/128)), joint='curve')
    for x,y in [(43,47),(64,80),(85,47)]:
        r=5*size*scale/128; x=x*size*scale/128; y=y*size*scale/128
        d.ellipse((x-r,y-r,x+r,y+r), fill='#19382b')
    x,y=64*size*scale/128,99*size*scale/128; r=4*size*scale/128
    d.ellipse((x-r,y-r,x+r,y+r),fill='#19382b')
    canvas.resize((size,size), Image.Resampling.LANCZOS).save(ROOT / 'extension' / 'icons' / f'icon{size}.png')
print('İkonlar üretildi.')
