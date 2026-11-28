import numpy as np
from PIL import Image,ImageDraw
from scipy.ndimage import binary_fill_holes,binary_closing,binary_dilation,label
from pathlib import Path
import argparse,hashlib,json
ROOT=Path(__file__).resolve().parents[4]
parser=argparse.ArgumentParser(description='Ankle-anchored foot fitting authoring work, not a production replacement.')
parser.add_argument('heads',type=Path);parser.add_argument('output',type=Path);args=parser.parse_args();dest=args.output.resolve()
if dest==ROOT/'assets' or ROOT/'assets' in dest.parents:raise ValueError('Cannot write runtime assets')
dest.mkdir(parents=True,exist_ok=True)
hero_path=ROOT/'assets/characters/protagonist-walk9.png'
if hashlib.sha256(hero_path.read_bytes()).hexdigest()!='5c0e6e4f834f317f193e33202700ae7dbb94e0570a5c2924d48c0a079400fb42':raise ValueError('Original actor changed')
orig=np.array(Image.open(hero_path).convert('RGBA'));head_input=Image.open(args.heads/'scalp-fit.png').convert('RGBA')
if head_input.size!=(2304,1024):raise ValueError('Wrong input grid')
out=np.array(head_input);before=out.copy()
source_path=Path(__file__).parent/'sources/bare-feet-poses.png'
m=json.loads((Path(__file__).parent/'source-art.json').read_text())
if hashlib.sha256(source_path.read_bytes()).hexdigest()!=m['files'][source_path.name]['sha256']:raise ValueError('Foot source changed: review required')
src=Image.open(source_path).convert('RGBA');parts=[]
for r in range(4):
 row=[]
 for c in range(4):
  a=np.array(src.crop((c*src.width//4,r*src.height//4,(c+1)*src.width//4,(r+1)*src.height//4)));R,G,B=[a[:,:,i].astype(float) for i in range(3)]
  a[(R>180)&(G<85)&(B<85)]=0
  labs,n=label(a[:,:,3]>160);sizes=np.bincount(labs.ravel());sizes[0]=0;keep=labs==sizes.argmax();a[~binary_dilation(keep,iterations=1)]=0
  yy,xx=np.where(keep);row.append(Image.fromarray(a).crop((xx.min(),yy.min(),xx.max()+1,yy.max()+1)))
 parts.append(row)
# Per-frame editing windows authored on original actor coordinates; paired feet may overlap.
boxes=[
[[(92,219,123,248),(130,220,160,248)],[(107,199,126,225),(121,222,150,248)],[(108,196,129,220),(122,224,148,248)],[(103,220,133,248),(129,190,150,215)],[(108,207,127,231),(118,203,149,248)],[(100,220,130,248),(124,190,146,215)],[(108,197,129,221),(123,220,153,248)],[(104,198,134,233),(121,219,150,248)],[(103,204,134,248),(127,199,149,222)]],
[[(87,222,135,248),(122,223,163,248)],[(57,218,106,245),(135,215,181,243)],[(77,222,127,248),(141,204,181,245)],[(106,222,151,248),(140,207,173,245)],[(58,205,104,243),(157,215,203,248)],[(55,217,106,244),(145,216,190,248)],[(77,220,126,248),(148,194,184,238)],[(93,220,140,248),(139,198,170,238)],[(44,211,94,243),(150,215,195,248)]],
[[(100,222,145,248),(130,225,163,248)],[(65,215,111,247),(155,219,202,248)],[(64,213,108,248),(143,222,193,248)],[(86,208,120,240),(111,221,158,248)],[(94,226,143,248),(130,199,178,230)],[(58,212,105,247),(151,218,202,248)],[(59,206,102,246),(141,221,193,248)],[(85,205,120,240),(115,222,163,248)],[(72,225,123,248),(128,194,178,219)]],
[[(91,217,124,248),(135,217,170,248)],[(108,193,134,216),(128,216,158,248)],[(107,204,133,222),(128,215,158,248)],[(111,220,144,248),(132,209,155,227)],[(114,221,144,248),(136,169,160,194)],[(116,193,139,213),(128,222,160,248)],[(111,205,136,224),(129,216,162,248)],[(114,214,146,248),(132,205,155,224)],[(114,221,142,248),(132,172,157,211)]]]
poses=[[[0,1],[0,3],[0,1],[0,1],[0,3],[0,1],[0,1],[2,1],[2,1]],[[0,0],[2,1],[0,3],[0,1],[2,0],[2,0],[0,3],[0,3],[2,0]],[[0,0],[1,2],[3,0],[1,0],[0,3],[1,2],[3,0],[3,0],[0,3]],[[0,1],[0,3],[0,3],[0,1],[0,3],[0,1],[0,3],[2,1],[0,3]]]
ankles=[
[[(108,222),(144,223)],[(116,200),(135,225)],[(118,197),(135,224)],[(118,222),(140,192)],[(118,208),(134,205)],[(115,222),(134,192)],[(119,198),(139,222)],[(119,201),(136,220)],[(119,207),(138,201)]],
[[(121,222),(140,225)],[(104,225),(164,218)],[(115,224),(164,214)],[(138,225),(156,215)],[(97,225),(187,222)],[(100,225),(174,223)],[(113,224),(162,205)],[(126,224),(158,207)],[(89,225),(181,223)]],
[[(117,227),(135,225)],[(84,218),(172,224)],[(83,219),(159,227)],[(105,214),(128,226)],[(111,228),(145,202)],[(78,218),(170,225)],[(81,215),(158,227)],[(105,212),(136,226)],[(95,228),(143,196)]],
[[(109,231),(148,231)],[(120,201),(141,217)],[(118,210),(141,219)],[(128,228),(143,211)],[(129,225),(149,174)],[(127,197),(144,229)],[(124,210),(145,218)],[(129,217),(142,212)],[(127,226),(144,181)]]]
angles=[[[0,0]]*9,[[0,0],[12,-10],[0,5],[0,-5],[15,0],[10,0],[0,0],[0,0],[15,0]],[[0,0],[16,-18],[0,0],[0,0],[0,0],[12,-15],[0,0],[0,0],[0,0]],[[0,0]]*9]
mask=np.zeros(orig.shape[:2],np.uint8)
for r in range(4):
 for c in range(9):
  cell=orig[r*256:(r+1)*256,c*256:(c+1)*256];base=out[r*256:(r+1)*256,c*256:(c+1)*256].copy();rgb=cell[:,:,:3].astype(float)
  shoe=np.sqrt(((rgb-np.array([95,50,28]))**2).sum(2));pants=np.sqrt(((rgb-np.array([152,119,81]))**2).sum(2))
  # Preserve the original cuff's geometry and shading; the new feet extend underneath it.
  cloth=(pants<shoe)&(cell[:,:,3]>100)&(rgb[:,:,0]-rgb[:,:,1]<48)&(rgb[:,:,1]-rgb[:,:,2]>18)
  labs,n=label(cloth);sz=np.bincount(labs.ravel());good=np.where(sz>100)[0];good=good[good!=0];cloth=np.isin(labs,good)
  cloth=binary_fill_holes(binary_closing(cloth,iterations=1))
  edits=np.zeros((256,256),bool);foot=Image.new('RGBA',(256,256))
  order=[0,1] if r!=2 else [1,0]
  for i in order:
   x,y,x2,y2=boxes[r][c][i];edits[y:y2,x:x2]=True
   p=parts[r][poses[r][c][i]];w=x2-x;h=y2-y
   # Slim the removed boot bulk toward the ankle side, keeping the cuff and ground line fixed.
   tw=max(1,round(w*.88));a=np.array(p);pa=a[:,:,3]>160;ay,ax=np.where(pa[:min(10,p.height)]);sx=float(ax.mean());sy=0.
   tx,ty=ankles[r][c][i];ty-=3
   ang=np.radians(angles[r][c][i]);R=np.array([[np.cos(ang),-np.sin(ang)],[np.sin(ang),np.cos(ang)]])
   A=R@np.diag([tw/p.width,h/p.height]);inv=np.linalg.inv(A);offset=np.array([sx,sy])-inv@np.array([tx,ty]);coeff=tuple([*inv[0],offset[0],*inv[1],offset[1]])
   part=p.transform((256,256),Image.Transform.AFFINE,coeff,Image.Resampling.BICUBIC)
   qa=np.array(part);ys,xs=np.where(qa[:,:,3]>64)
   if len(ys) and ys.max()>y2-1:
    f=(y2-1-ty)/max(1,ys.max()-ty);A=np.diag([1,f])@A;inv=np.linalg.inv(A);offset=np.array([sx,sy])-inv@np.array([tx,ty]);coeff=tuple([*inv[0],offset[0],*inv[1],offset[1]])
    part=p.transform((256,256),Image.Transform.AFFINE,coeff,Image.Resampling.BICUBIC)
   foot.alpha_composite(part)
  base[edits]=0;edits |= np.array(foot)[:,:,3]>0;result=np.array(Image.alpha_composite(Image.fromarray(base),foot));restore=cloth&edits;result[restore]=cell[restore]
  out[r*256:(r+1)*256,c*256:(c+1)*256]=result;mask[r*256:(r+1)*256,c*256:(c+1)*256]=edits*255
Image.fromarray(out).save(dest/'head-feet-fit.png');Image.fromarray(mask).save(dest/'foot-edit-domain.png')
proof=Image.new('RGBA',(9*192,4*120),(70,70,70,255));d=ImageDraw.Draw(proof)
for r in range(4):
 for c in range(9):
  p=Image.fromarray(out).crop((c*256+25,r*256+168,c*256+230,r*256+256)).resize((192,82));proof.alpha_composite(p,(c*192,r*120+20));d.text((c*192+5,r*120+2),f'{r},{c}',fill='white')
proof.save(dest/'foot-fit-proof.png')

assert np.array_equal(out[mask==0],before[mask==0]),'Drift outside foot editing windows'
report={'production_ready':False,'source_sha256':hashlib.sha256(hero_path.read_bytes()).hexdigest(),'outside_foot_edit_domain_changed_pixels':int(np.any(out[mask==0]!=before[mask==0],axis=1).sum()),'ankles':ankles,'editing_windows':boxes,'pose_indices':poses,'rotation_degrees':angles,'limitations':['Manually fitted ankle anchors still require final seam and occlusion review.','Head input is authoring material, not a proof that every face pixel is original.','Belt, watch and gauntlet removal are not included.']}
(dest/'foot-report.json').write_text(json.dumps(report,indent=2)+'\n')
Image.fromarray(out).resize((756,336),Image.Resampling.LANCZOS).save(dest/'head-feet-84.png')
for r,name in enumerate(('down','left','right','up')):
 frames=[Image.fromarray(out).crop((c*256,r*256,(c+1)*256,(r+1)*256)).resize((168,168),Image.Resampling.LANCZOS) for c in range(1,9)]
 frames[0].save(dest/(name+'-walk.gif'),save_all=True,append_images=frames[1:],duration=125,loop=0,disposal=2)
print(json.dumps({'production_ready':False,'outside_foot_edit_domain_changed_pixels':report['outside_foot_edit_domain_changed_pixels']}))
