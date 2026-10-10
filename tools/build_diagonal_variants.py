# Source paintings: put the all-diagonal and no-diagonal crossings in assets/environment/diagonal/source/ as city-all.jpg and city-none.jpg (not committed; 9 MB).
import sys, itertools
from PIL import Image, ImageDraw, ImageFilter
U='assets/environment/diagonal/source/'
W,H=1600,1000
allc=Image.open(U+'city-all.jpg').convert('RGB').resize((W,H),Image.LANCZOS)
none=Image.open(U+'city-none.jpg').convert('RGB').resize((W,H),Image.LANCZOS)
S=2  # 800->1600
X0,X1,Y0,Y1=370*S,428*S,222*S,278*S   # asphalt edges in the all-diagonal art
rects={'nw':(0,0,X0,Y0),'ne':(X1,0,W,Y0),'sw':(0,Y1,X0,H),'se':(X1,Y1,W,H)}
def variant(open_):
    m=Image.new('L',(W,H),0);d=ImageDraw.Draw(m)
    for c in open_: d.rectangle(rects[c],fill=255)
    m=m.filter(ImageFilter.GaussianBlur(4))
    return Image.composite(allc,none,m)
combos=sys.argv[1:]
for c in combos:
    variant(c.split('-') if c!='none' else []).save(f'assets/environment/diagonal/city/{c}.webp',quality=86)
