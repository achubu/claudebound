# Source paintings (not committed): assets/environment/diagonal/source/elaris-all.jpg and elaris-none.jpg. Usage: python3 tools/build_elaris_diagonals.py se nw-se ...  (writes masks to el/masks.json for DIAG_MASK_SRC.elaris)
from PIL import Image,ImageDraw,ImageFilter;import numpy as np,base64,json,sys
from scipy import ndimage as nd
U='assets/environment/diagonal/source/'
ALL,NONE=U+'elaris-all.jpg',U+'elaris-none.jpg'
X0,X1,Y0,Y1=378,422,226,270
yy,xx=np.mgrid[0:500,0:800]
def segdist(x1,y1,x2,y2):
  vx,vy=x2-x1,y2-y1;t=np.clip(((xx-x1)*vx+(yy-y1)*vy)/(vx*vx+vy*vy),0,1);return np.hypot(xx-(x1+t*vx),yy-(y1+t*vy))
def raw(f):
  a=np.asarray(Image.open(f).convert('RGB').resize((800,500),Image.LANCZOS)).astype(int)
  r,g,b=a[...,0],a[...,1],a[...,2]
  dirt=(r>140)&(r>=g)&(g>b)&(r-b>45)&(g>100)
  dirt=nd.binary_closing(nd.binary_opening(dirt,iterations=1),iterations=5)
  lab,n=nd.label(dirt);keep=lab==lab[248,330]
  return nd.binary_closing(np.pad(keep,20,mode='edge'),iterations=6)[20:-20,20:-20]
diag=np.zeros((500,800),bool);wide=diag.copy()
for c in [(0,0),(800,0),(0,500),(800,500)]: d=segdist(c[0],c[1],400,250);diag|=d<72;wide|=d<80
band=((yy>=Y0)&(yy<=Y1+3))|((xx>=X0-2)&(xx<=X1+1))
circle=np.hypot(xx-400,yy-250)<60
ra=raw(ALL);dg=nd.binary_dilation(ra,iterations=8)&diag
j=np.pad(dg|band,20,mode='edge');dg=dg|(nd.binary_closing(j,iterations=16)[20:-20,20:-20]&wide)
m_all=band|dg|circle;m_all=m_all|(nd.binary_closing(np.pad(m_all,20,mode='edge'),iterations=14)[20:-20,20:-20]&(wide|band)); m_none=band|circle
def enc(m):
  s=m.reshape(125,4,200,4).mean((1,3))>=.5;return base64.b64encode(np.packbits(s.flatten())).decode(),s
out={}
for k,m in [('all',m_all),('none',m_none)]:
  e,s=enc(m);out[k]=e
  im=np.asarray(Image.open(ALL if k=='all' else NONE).convert('RGB').resize((800,500))).copy()
  big=np.kron(s,np.ones((4,4),bool));im[~big]=(im[~big]*.35).astype(np.uint8);Image.fromarray(im).save('assets/environment/diagonal/elaris/chk-'+k+'.png')
json.dump(out,open('assets/environment/diagonal/elaris/masks.json','w'))
# variants
W,H=1600,1000
A=Image.open(ALL).convert('RGB').resize((W,H),Image.LANCZOS);N=Image.open(NONE).convert('RGB').resize((W,H),Image.LANCZOS)
rects={'nw':(0,0,X0*2,Y0*2),'ne':(X1*2,0,W,Y0*2),'sw':(0,Y1*2,X0*2,H),'se':(X1*2,Y1*2,W,H)}
for c in sys.argv[1:]:
  m=Image.new('L',(W,H),0);d=ImageDraw.Draw(m)
  for q in c.split('-'): d.rectangle(rects[q],fill=255)
  Image.composite(A,N,m.filter(ImageFilter.GaussianBlur(4))).save(f'assets/environment/diagonal/elaris/{c}.webp',quality=86)
print('ok')
