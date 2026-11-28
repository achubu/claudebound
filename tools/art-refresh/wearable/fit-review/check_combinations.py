#!/usr/bin/env python3
"""Read-only all-64-outfit audit, preserving original face and exposed fingers."""
import itertools,json,sys,zipfile,io
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[4];sys.path.insert(0,str(ROOT/'tools'));import wearable_add as w
names=['cyber-pants','cyber-boots','cyber-chest','cyber-belt','cyber-gloves','neon-visor'];base=w.rgba(w.BASE);hero=w.rgba(w.HERO)
z=zipfile.ZipFile(ROOT/'tools/art-refresh/wearable/cyber-gloves-preparation/Gloves-Preparation.zip');hands=np.array(Image.open(io.BytesIO(z.read('hands-mask.png'))).convert('L'))>127
R,G,B=[hero[:,:,k].astype(float) for k in range(3)];skin=hands&(R>130)&(R>G*1.32)&(G>B*1.2)&(G>65)&(hero[:,:,3]>200)
prot=(np.array(Image.open(ROOT/'gear/templates/protected.png').convert('L'))>127)&(hero[:,:,3]>200)
face=np.zeros((1024,2304),bool);shirt=np.array(Image.open(ROOT/'gear/templates/shirt-mask.png').convert('L'))>127
for r in range(4):
 for c in range(9):
  yy=np.where(shirt[r*256:(r+1)*256,c*256:(c+1)*256].any(1))[0]
  if len(yy):face[r*256:r*256+yy.min(),c*256:(c+1)*256]=True
face &= hero[:,:,3]>200
looks={}
for n in names:
 p=Path(w.WEAR)/n;m=json.loads((p/'look.json').read_text());looks[n]=(m['slot'],w.rgba(p/'overlay.png'),w.rgba(p/'clear.png') if m.get('clear') else None)
 if n=='cyber-belt' and len(sys.argv)>2:
  candidate=Path(sys.argv[2]);looks[n]=(m['slot'],w.rgba(candidate/'overlay.png'),w.clear_from_cleaned(base,w.rgba(candidate/'cleaned.png')))
cyan=(B>150)&(G>150)&(R<140)&(B-R>60)&(hero[:,:,3]>200)
results=[]
for bits in itertools.product((0,1),repeat=6):
 selected=[n for n,on in zip(names,bits) if on];ov=[(looks[n][0],looks[n][1]) for n in selected];cl=[looks[n][2] for n in selected if looks[n][2] is not None]
 a=np.array(w.composite(base,cl,ov,w.default_patches())).astype(np.int16);diff=(np.abs(a[:,:,:3]-hero[:,:,:3])>3).any(-1)
 # Ignore hand pixels intentionally covered by glove art; the rest must remain original skin.
 covered=looks['cyber-gloves'][1][:,:,3]>0 if bits[4] else np.zeros(skin.shape,bool)
 results.append({'looks':selected,'protected_margin_changed':int((diff&prot).sum()),'aetherlink_cyan_changed':int((diff&cyan).sum()),'uncovered_hand_changed':int((diff&skin&~covered).sum()),'face_changed_without_helm':int((diff&face).sum()) if not bits[5] else None})
out=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).parent/'combinations.json';out.write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps({'combinations':len(results),'aetherlink_core_failures':sum(x['aetherlink_cyan_changed']>0 for x in results),'face_failures':sum((x['face_changed_without_helm'] or 0)>0 for x in results),'hand_failures':sum(x['uncovered_hand_changed']>20 for x in results),'worst_hand_pixels':max(x['uncovered_hand_changed'] for x in results)}))
print(json.dumps([x for x in results if x['uncovered_hand_changed']>300][:3]))
