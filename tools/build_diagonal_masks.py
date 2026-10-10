# Source paintings: put the all-diagonal and no-diagonal crossings in assets/environment/diagonal/source/ as city-all.jpg and city-none.jpg (not committed; 9 MB).
from PIL import Image;import numpy as np,base64,json
from scipy import ndimage as nd
U='assets/environment/diagonal/source/'
yy,xx=np.mgrid[0:500,0:800]
def segdist(x1,y1,x2,y2):
  vx,vy=x2-x1,y2-y1;t=np.clip(((xx-x1)*vx+(yy-y1)*vy)/(vx*vx+vy*vy),0,1);return np.hypot(xx-(x1+t*vx),yy-(y1+t*vy))
def raw(f):
  a=np.asarray(Image.open(U+f).convert('RGB').resize((800,500),Image.LANCZOS)).astype(int)
  r,g,b=a[...,0],a[...,1],a[...,2];L=(r+g+b)/3
  road=((b>=r+8)&(L<120)&(g<=b+5))|((b>150)&(g>150))
  road=nd.binary_closing(nd.binary_opening(road,iterations=1),iterations=4)
  lab,n=nd.label(road);keep=lab==lab[250,330]
  return nd.binary_dilation(nd.binary_closing(keep,iterations=6),iterations=6)|(np.hypot(xx-400,yy-250)<60)
island=np.hypot(xx-400,yy-250)<44
cross=((yy>=200)&(yy<=298))|((xx>=345)&(xx<=455))
diag=np.zeros_like(cross)
for c in [(0,0),(800,0),(0,500),(800,500)]: diag|=segdist(c[0],c[1],400,250)<48
band=((yy>=204)&(yy<=295))|((xx>=352)&(xx<=447))
rd=np.pad(raw('city-all.jpg')&diag,20,mode='edge')
dg=(nd.binary_fill_holes(nd.binary_closing(rd,iterations=8))[20:-20,20:-20]|(raw('city-all.jpg')&diag))&diag
wide=np.zeros_like(diag)
for c in [(0,0),(800,0),(0,500),(800,500)]: wide|=segdist(c[0],c[1],400,250)<64
j=np.pad(dg|band,20,mode='edge');dg=dg|(nd.binary_closing(j,iterations=16)[20:-20,20:-20]&wide)
m_all=band|dg|(np.hypot(xx-400,yy-250)<60)
m_none=band|(np.hypot(xx-400,yy-250)<60)
def enc(m):
  s=m.reshape(125,4,200,4).mean((1,3))>=.5
  return base64.b64encode(np.packbits(s.flatten())).decode(),s
out={}
for k,m in [('all',m_all),('none',m_none)]:
  e,s=enc(m);out[k]=e
  im=np.asarray(Image.open('assets/environment/diagonal/city/ne-nw-se.webp' if k=='all' else 'assets/environment/diagonal/city/none.webp').convert('RGB').resize((800,500))).copy()
  big=np.kron(s,np.ones((4,4),bool));im[~big]=(im[~big]*.35).astype(np.uint8);Image.fromarray(im).save('chk-'+k+'.png')
json.dump(out,open('masks.json','w'));print({k:len(v) for k,v in out.items()})
