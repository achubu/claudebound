from pathlib import Path
import numpy as np
from scipy.ndimage import shift
from PIL import Image,ImageDraw
from scipy.ndimage import binary_fill_holes,binary_closing,binary_dilation,label
import argparse,hashlib,json
ROOT=Path(__file__).resolve().parents[4]
parser=argparse.ArgumentParser(description='Fit scalp editing material around the locked original face features; not a complete neutral actor.')
parser.add_argument('output',type=Path);args=parser.parse_args();dest=args.output.resolve()
if dest==ROOT/'assets' or ROOT/'assets' in dest.parents: raise ValueError('Cannot write runtime assets')
dest.mkdir(parents=True,exist_ok=True)
root=ROOT
hero_path=root/'assets/characters/protagonist-walk9.png'
if hashlib.sha256(hero_path.read_bytes()).hexdigest()!='5c0e6e4f834f317f193e33202700ae7dbb94e0570a5c2924d48c0a079400fb42': raise ValueError('Original actor changed: recalibration required')
hero=np.array(Image.open(root/'assets/characters/protagonist-walk9.png').convert('RGBA'))
source_path=Path(__file__).parent/'sources/scalp-turnaround.png'
source_meta=json.loads((Path(__file__).parent/'source-art.json').read_text())
if hashlib.sha256(source_path.read_bytes()).hexdigest()!=source_meta['files'][source_path.name]['sha256']: raise ValueError('Scalp source changed: review required')
src=Image.open(source_path).convert('RGBA')
out=hero.copy();faces=np.zeros(hero.shape[:2],np.uint8);edits=faces.copy();necks=faces.copy();trans=[]
# Source eye reference; source artwork only supplies scalp, never replacement faces.
points=[(259,382,128,51,.18),(162,333,111,43,.18),(355,343,142,46,.18),(272,335,127,43,.18)]
patches=[(114,49,141,69),(107,40,129,59),(129,46,145,62),(110,34,145,59)]
for r in range(4):
 idle=hero[r*256:(r+1)*256,:256];ref=idle[:,:,:3].mean(axis=2);x0,y0,x1,y1=patches[r];tpl=ref[y0:y1,x0:x1]
 yy,xx=np.indices((256,256))
 # Protect facial interior and jaw contours, selected in original cell coordinates.
 polys=[[(112,49),(114,47),(120,47),(124,49),(130,49),(134,46),(141,47),(144,51),(147,51),(147,56),(143,60),(139,64),(134,69),(128,71),(120,67),(115,61),(111,57),(110,53)],[(106,39),(119,39),(124,42),(127,44),(130,42),(133,43),(133,48),(129,51),(133,54),(128,60),(114,63),(109,60),(108,55),(106,52),(103,49),(104,46),(106,43)],[(139,44),(144,44),(145,48),(149,50),(147,53),(146,57),(141,62),(136,61),(133,59),(130,55),(127,53),(124,51),(124,48),(128,47),(132,48),(135,46)],[]]
 pm=Image.new('L',(256,256));d=ImageDraw.Draw(pm)
 if polys[r]:d.polygon(polys[r],fill=255)
 keep=np.array(pm)>0
 face=keep
 crop=src.crop((r*src.width//4,0,(r+1)*src.width//4,src.height));sx,sy,tx,ty,s=points[r]
 scalp=crop.transform((256,256),Image.Transform.AFFINE,(1/s,0,sx-tx/s,0,1/s,sy-ty/s),Image.Resampling.BICUBIC)
 scalp_arr=np.array(scalp);cut=[61,59,62,66][r];scalp_arr[cut:]=0;scalp=Image.fromarray(scalp_arr)
 for c in range(9):
  cell=hero[r*256:(r+1)*256,c*256:(c+1)*256];gray=cell[:,:,:3].mean(axis=2)
  search=gray[y0-16:y1+17,x0-16:x1+17];best=(-1,0,0)
  for oy in range(33):
   for ox in range(33):
    a=search[oy:oy+tpl.shape[0],ox:ox+tpl.shape[1]];a=a-a.mean();b=tpl-tpl.mean();den=float(np.sqrt((a*a).sum()*(b*b).sum()));v=float((a*b).sum()/den) if den else -1
    if v>best[0]:best=(v,ox-16,oy-16)
  v,dx,dy=best
  if v<.8: raise ValueError(f'Uncertain head registration: {r},{c} score={v}; manual calibration needed')
  trans.append([r,c,dx,dy,round(v,4)])
  fm=shift(face.astype(np.uint8),(dy,dx),order=0)>0
  sc=Image.new('RGBA',(256,256));sc.paste(scalp,(dx,dy))
  base=cell.copy();region=(xx>=95+dx)&(xx<163+dx)&(yy>=5+dy)&(yy<cut+dy)
  blue=(cell[:,:,2].astype(float)>cell[:,:,0]*1.05)&(cell[:,:,2]>cell[:,:,1])
  region &= ~binary_dilation(blue,iterations=1)
  base[region]=0
  result=np.array(Image.alpha_composite(Image.fromarray(base),sc));result[fm]=cell[fm]
  # Original neck/collar remain exact below edit strip.
  result[~region]=cell[~region]
  if r==1: anterior=(xx<124+dx)&(yy>=40+dy)&(yy<cut+dy)
  elif r==2: anterior=(xx>131+dx)&(yy>=46+dy)&(yy<cut+dy)
  elif r==0: anterior=(xx>=113+dx)&(xx<=143+dx)&(yy>=49+dy)&(yy<cut+dy)
  else: anterior=np.zeros_like(region)
  before=result.copy();result[anterior]=cell[anterior];fm|=anterior
  if r==1:
   old_bang=(xx<106+dx)&(yy>=40+dy)&(yy<44+dy)
   result[old_bang]=before[old_bang];fm[old_bang]=False
  nx,ny,nx2,ny2=[(117,69,140,82),(120,57,142,73),(119,59,140,73),(113,66,142,78)][r]
  nm=(xx>=nx+dx)&(xx<nx2+dx)&(yy>=ny+dy)&(yy<ny2+dy)
  result[nm]=cell[nm];necks[r*256:(r+1)*256,c*256:(c+1)*256]=nm*255
  out[r*256:(r+1)*256,c*256:(c+1)*256]=result;faces[r*256:(r+1)*256,c*256:(c+1)*256]=fm*255;edits[r*256:(r+1)*256,c*256:(c+1)*256]=region*255
Image.fromarray(necks).save(dest/'neck-lock.png');Image.fromarray(out).save(dest/'scalp-fit.png');Image.fromarray(faces).save(dest/'face-lock.png');Image.fromarray(edits).save(dest/'scalp-edit-domain.png')
protected=faces>0;domain=edits>0
assert np.array_equal(out[protected],hero[protected]),'Protected face feature drift'
assert np.array_equal(out[necks>0],hero[necks>0]),'Original neck/collar attachment drift'
assert np.array_equal(out[~domain],hero[~domain]),'Changes outside scalp editing domain'
report={'source_sha256':hashlib.sha256(hero_path.read_bytes()).hexdigest(),'source_size':[2304,1024],'registration':trans,'protected_feature_changed_pixels':int(np.any(out[protected]!=hero[protected],axis=1).sum()),'outside_edit_domain_changed_pixels':int(np.any(out[~domain]!=hero[~domain],axis=1).sum()),'neck_changed_pixels':int(np.any(out[necks>0]!=hero[necks>0],axis=1).sum()),'production_ready':False,'limitations':['Forehead and newly exposed temples are edited; protection mask covers original facial features, not every skin pixel.','Foot, belt, wrist and device removal are not included.','This sheet is editing material, not a complete neutral replacement.']}
(dest/'report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='registration'}))
proof=Image.new('RGBA',(9*160,4*160),(70,70,70,255))
for r in range(4):
 for c in range(9):
  p=Image.fromarray(out).crop((c*256+95,r*256+10,c*256+165,r*256+80)).resize((160,160));proof.alpha_composite(p,(c*160,r*160))
proof.convert('RGB').save(dest/'scalp-fit-proof.jpg')

Image.fromarray(out).resize((756,336),Image.Resampling.LANCZOS).save(dest/'scalp-body-84.png')
for r,name in enumerate(('down','left','right','up')):
 frames=[Image.fromarray(out).crop((c*256,r*256,(c+1)*256,(r+1)*256)).resize((168,168),Image.Resampling.LANCZOS) for c in range(1,9)]
 frames[0].save(dest/(name+'-walk.gif'),save_all=True,append_images=frames[1:],duration=125,loop=0,disposal=2)
