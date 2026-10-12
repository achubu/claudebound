# Round 91: stitch the six Neon Aftermath district paintings (assets/environment/world/) into one 9x6-room world
# and trace its walkable streets into walk.npy (4px cells); preview.png shows the result.
from PIL import Image,ImageDraw;import numpy as np
from scipy import ndimage as nd
U='assets/environment/world/'
L=[['a-harbor','b-neon-square','c-crystal-citadel'],['d-overgrown-park','e-lantern-quarter','f-junkyard-lots']]
TW,TH=2400,1500
world=Image.new('RGB',(TW*3,TH*2))
for r in range(2):
  for c in range(3):
    world.paste(Image.open(U+L[r][c]+'.webp').convert('RGB').resize((TW,TH),Image.LANCZOS),(c*TW,r*TH))
world.save('world.png')
# walk mask at 4px
small=np.asarray(world.resize((TW*3//4,TH*2//4),Image.LANCZOS)).astype(int)
R,G,B=small[...,0],small[...,1],small[...,2]
walk=(G>R+18)&(np.abs(B-G)<26)&(G>95)&(G<200)&(R<150)
walk=nd.binary_opening(walk,iterations=1)
CLOSE=[[4,9,4],[4,4,8]]  # per tile: the plaza and arena have puddles, stalls and junk breaking the paving
out=np.zeros_like(walk);th,tw=TH//4,TW//4
for r in range(2):
  for c in range(3):
    k=CLOSE[r][c];t=walk[r*th:(r+1)*th,c*tw:(c+1)*tw]
    out[r*th:(r+1)*th,c*tw:(c+1)*tw]=nd.binary_closing(np.pad(t,k+2,mode='edge'),iterations=k)[k+2:-k-2,k+2:-k-2]
# seams: re-close a thin band across each tile boundary so roads join
walk=out
for c in (1,2):
  x=c*tw;band=walk[:,x-12:x+12];walk[:,x-12:x+12]=nd.binary_closing(np.pad(band,6,mode='edge'),iterations=4)[6:-6,6:-6]
y=th;band=walk[y-12:y+12,:];walk[y-12:y+12,:]=nd.binary_closing(np.pad(band,6,mode='edge'),iterations=4)[6:-6,6:-6]
# hand-placed links where the art clearly continues (plaza steps, courtyards, junkyard spur) — mask coords
from PIL import ImageDraw as _D
m=Image.fromarray((walk*255).astype(np.uint8));d=_D.Draw(m)
for a,b in [((905,255),(905,325)),((812,232),(812,325)),((1000,280),(1000,335)),((1702,470),(1690,650)),((1605,585),(1640,618)),((665,490),(665,555)),((1085,495),(1085,528))]:
  d.line([a,b],fill=255,width=14)
for box in [(1308,108,1415,268),(1345,55,1440,90)]:  # Crystal Citadel pools and waterfalls
  d.rectangle(box,fill=0)
walk=np.asarray(m)>0
lab,n=nd.label(walk);sizes=nd.sum(walk,lab,range(1,n+1))
keep=lab==(np.argmax(sizes)+1)  # one connected world
# Round 91: drop room-local slivers (a street grazing a room's edge for a few pixels)
RW,RH=200,125;dropped=0
for cy in range(6):
  for cx in range(9):
    sub=keep[cy*RH:(cy+1)*RH,cx*RW:(cx+1)*RW];l2,n2=nd.label(sub)
    for i in range(1,n2+1):
      a=(l2==i).sum()
      if a<260: sub[l2==i]=False;dropped+=1
lab3,n3=nd.label(keep);sz3=nd.sum(keep,lab3,range(1,n3+1));keep=lab3==(np.argmax(sz3)+1)
print('slivers dropped',dropped,'components after',n3)
np.save('walk_all.npy',walk)
np.save('walk.npy',keep)
lab2,n2=nd.label(keep);print('components',n2,sorted([int((lab2==i).sum()) for i in range(1,n2+1)],reverse=True)[:8])
# preview
pv=world.resize((1800,750));a=np.asarray(pv).copy()
cols=[(0,255,120),(255,60,60),(60,120,255),(255,220,0),(255,0,255),(0,255,255),(255,140,0),(160,255,0)]
for i in range(1,n2+1): m=lab2==i; a[m]=(a[m]*.45+np.array(cols[(i-1)%8])*.55).astype(np.uint8)
a[~keep]=(a[~keep]*.45).astype(np.uint8)
pv=Image.fromarray(a);d=ImageDraw.Draw(pv)
for x in range(0,1801,200): d.line([x,0,x,750],fill=(255,255,255) if x%600==0 else (120,120,120),width=2 if x%600==0 else 1)
for y in range(0,751,125): d.line([0,y,1800,y],fill=(255,255,255) if y%375==0 else (120,120,120),width=2 if y%375==0 else 1)
for cx in range(9):
  for cy in range(6): d.text((cx*200+4,cy*125+3),f'{cx},{cy}',fill=(255,255,255))
pv.save('preview.png')
