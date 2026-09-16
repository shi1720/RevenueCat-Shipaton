#!/usr/bin/env python3
"""Create branded submission cover PNGs using original assets and actual UI."""
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/submission'
TEMP = ROOT / '.codex-finalizer/video'
TEMP.mkdir(parents=True,exist_ok=True)
source = TEMP / 'cover-native-frame.png'
subprocess.run(['ffmpeg','-v','error','-y','-ss','0','-i',str(OUT/'unpause-native-walkthrough.mp4'),'-frames:v','1',str(source)],check=True)

def face(name,size):
    files={'serif':'fraunces/500Medium/Fraunces_500Medium.ttf','sans':'dm-sans/400Regular/DMSans_400Regular.ttf','medium':'dm-sans/500Medium/DMSans_500Medium.ttf','bold':'dm-sans/700Bold/DMSans_700Bold.ttf'}
    return ImageFont.truetype(str(ROOT/'node_modules/@expo-google-fonts'/files[name]),size)

def make(kind):
    is_cover=kind=='devpost'
    w,h=(1500,1000) if is_cover else (1920,1080)
    im=Image.new('RGB',(w,h),'#F8F7F3'); d=ImageDraw.Draw(im)
    x=84 if is_cover else 104
    # The right-hand native frame is uniformly scaled, never rewritten.
    pw,ph=(382,764) if is_cover else (470,940)
    px,py=(1020,100) if is_cover else (1334,64)
    d.rounded_rectangle((px-15,py-15,px+pw+15,py+ph+15),radius=30,fill='#E8E6EF')
    native=Image.open(source).convert('RGB').resize((pw,ph),Image.Resampling.LANCZOS)
    im.paste(native,(px,py))
    size=78 if is_cover else 94
    icon=Image.open(ROOT/'assets/icon.png').convert('RGB').resize((size,size),Image.Resampling.LANCZOS)
    im.paste(icon,(x,80))
    d.text((x+size+24,78),'Unpause',font=face('serif',59 if is_cover else 69),fill='#252638')
    d.text((x,225),'LEAVE YOURSELF A WAY BACK',font=face('bold',24 if is_cover else 29),fill='#5753A3')
    title='Pick up where\nyou left off.' if is_cover else 'Ten free minutes.\nA way back in.'
    d.multiline_text((x-6,300),title,font=face('serif',91 if is_cover else 108),fill='#252638',spacing=12)
    subtitle='A memory for your\nunfinished hobbies.' if is_cover else 'The next tiny step in\nyour unfinished hobbies.'
    d.multiline_text((x,570),subtitle,font=face('sans',42 if is_cover else 48),fill='#686773',spacing=8)
    label='Save a handoff. Make a little.'
    fs=face('medium',29 if is_cover else 34)
    pillw=int(d.textlength(label,font=fs))+48
    y=750 if is_cover else 766
    d.rounded_rectangle((x,y,x+pillw,y+65),radius=32,fill='#EAE8F2')
    d.text((x+24,y+12),label,font=fs,fill='#5753A3')
    d.text((x,h-81),'Shivam Gupta · Creator',font=face('medium',26 if is_cover else 29),fill='#686773')
    label='Native Android preview'
    fs=face('medium',23 if is_cover else 25)
    d.text((px+(pw-d.textlength(label,font=fs))/2,py+ph+27),label,font=fs,fill='#686773')
    filename='Unpause-devpost-cover.png' if is_cover else 'Unpause-youtube-thumbnail.png'
    im.save(OUT/filename,optimize=True)
    print(filename,im.size,(OUT/filename).stat().st_size)

make('devpost'); make('youtube')
