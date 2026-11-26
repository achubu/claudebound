#!/usr/bin/env python3
"""Reuse accepted art to close cloth-edge gaps and restore exact original fingers.
Writes art handoffs only; runtime files are read-only inputs.
"""
from pathlib import Path
import sys,json,hashlib,zipfile,io
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt
ROOT=Path(__file__).resolve().parents[4];sys.path.insert(0,str(ROOT/'tools'));import wearable_add as w
for name,expected in json.loads((Path(__file__).resolve().parent/'source-hashes.json').read_text()).items():
 if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=expected:raise RuntimeError('Source changed; review before rebuilding: '+name)
out=Path(__file__).resolve().parent/'handoff';out.mkdir(parents=True,exist_ok=True)
base=w.rgba(w.BASE).astype(np.uint8);hero=w.rgba(w.HERO).astype(np.uint8)
z=zipfile.ZipFile(ROOT/'tools/art-refresh/wearable/cyber-gloves-preparation/Gloves-Preparation.zip')
hands=np.array(Image.open(io.BytesIO(z.read('hands-mask.png'))).convert('L'))>127
prot=np.array(Image.open(ROOT/'gear/templates/protected.png').convert('L'))>127
hands &= ~prot
clean=base.copy();restore=hands & (base[:,:,:3]!=hero[:,:,:3]).any(-1);clean[restore,:3]=hero[restore,:3]
assert np.array_equal(clean[:,:,3],base[:,:,3]);assert np.array_equal(clean[~hands],base[~hands])
# Reconstruct current full set, but with only original fingers restored under the glove.
selected={'pants':'cyber-pants','boots':'cyber-boots','shirt':'cyber-chest','belt':'cyber-belt','gloves':'cyber-gloves','helmet':'neon-visor'}
ovs=[];clears=[]
for sl,n in selected.items():
 p=Path(w.WEAR)/n;meta=json.loads((p/'look.json').read_text());ovs.append((sl,w.rgba(p/'overlay.png')))
 if meta.get('clear'):clears.append(w.rgba(p/'clear.png'))
full=np.array(w.composite(clean,clears,ovs,w.default_patches())).astype(np.int32)
cy=np.arange(1024)[:,None]%256;changes={}
for sl in ('pants','boots'):
 name=selected[sl];src=w.rgba(Path(w.WEAR)/name/'overlay.png').astype(np.uint8);new=src.copy()
 col,(y0,y1)=w.OLD_CLOTHES[sl];dc=np.sqrt(((full[:,:,:3]-np.array(col))**2).sum(-1));ds=np.sqrt(((full[:,:,:3]-np.array(w.SKIN))**2).sum(-1))
 mask=np.array(Image.open(ROOT/f'gear/templates/{sl}-mask.png').convert('L'))>127
 target=(full[:,:,3]>200)&(dc<28)&(dc<ds-15)&(cy>=y0)&(cy<y1)&mask&~hands&~prot
 if sl=='pants':
  br,bg,bb=[base[:,:,k].astype(float) for k in range(3)]
  khaki=(br>=bg)&(bg>=bb)&(br-bb>20)&(br-bb<110)&(bg-bb>8)&(br-bg<60)
  unchanged=(full[:,:,:3]==base[:,:,:3]).all(-1)
  target=khaki&unchanged&mask&~hands&~prot&(cy>=112)&(cy<=137)
 # Keep the original skin/forearms even when their shadow resembles khaki.
 R,G,B=[hero[:,:,k].astype(float) for k in range(3)]
 skin=(R>G*1.32)&(G>B*1.2)&(G>35)&(base[:,:,:3]==hero[:,:,:3]).all(-1)
 target &= (base[:,:,3]>=128)
 if sl=='pants': target &= ~skin
 count=0
 for r in range(4):
  for c in range(9):
   a=src[r*256:(r+1)*256,c*256:(c+1)*256];t=target[r*256:(r+1)*256,c*256:(c+1)*256]
   support=a[:,:,3]>=200;distance,idx=distance_transform_edt(~support,return_indices=True)
   t &= distance <= (12 if sl=='pants' else 3)
   cell=new[r*256:(r+1)*256,c*256:(c+1)*256];yy,xx=np.where(t);cell[yy,xx]=a[idx[0][yy,xx],idx[1][yy,xx]];cell[yy,xx,3]=255;count+=len(yy)
 dest=out/name;dest.mkdir(exist_ok=True);Image.fromarray(new).save(dest/'overlay.png');meta=json.loads((Path(w.WEAR)/name/'look.json').read_text());(dest/'manifest.json').write_text(json.dumps({'look':name,'slot':sl,'items':meta['items'],'cleaned':False},indent=2)+'\n');changes[sl]=count
p=out/'cyber-gloves';p.mkdir(exist_ok=True);Image.fromarray(clean).save(p/'cleaned.png');Image.open(Path(w.WEAR)/'cyber-gloves/overlay.png').save(p/'overlay.png');meta=json.loads((Path(w.WEAR)/'cyber-gloves/look.json').read_text());(p/'manifest.json').write_text(json.dumps({'look':'cyber-gloves','slot':'gloves','items':meta['items'],'cleaned':True},indent=2)+'\n')
changes['original_hand_pixels_restored']=int(restore.sum());(out/'changes.json').write_text(json.dumps(changes,indent=2)+'\n');print(changes)
