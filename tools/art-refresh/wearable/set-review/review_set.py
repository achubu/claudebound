#!/usr/bin/env python3
"""Read-only proof of the six currently integrated drawn looks."""
import json,sys
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[4];sys.path.insert(0,str(ROOT/'tools'))
import wearable_add as w
out=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).parent
out.mkdir(parents=True,exist_ok=True)
override=Path(sys.argv[2]) if len(sys.argv)>2 else None
selected={'pants':'cyber-pants','boots':'cyber-boots','shirt':'cyber-chest','belt':'cyber-belt','gloves':'cyber-gloves','helmet':'neon-visor'}
base=w.rgba(w.BASE);ovs=[];clears=[];items={}
for sl,name in selected.items():
 p=override/name if override and (override/name).exists() else Path(w.WEAR)/name
 meta=json.loads((p/('manifest.json' if (p/'manifest.json').exists() else 'look.json')).read_text());ov=w.rgba(p/'overlay.png');cl=w.rgba(p/'clear.png') if meta.get('clear') else None
 if meta.get('cleaned'):cl=w.clear_from_cleaned(base,w.rgba(p/'cleaned.png'))
 errors,edge=w.check_look(name,sl,meta['items'],ov,cl,w.rgba(w.HERO))
 if errors:raise RuntimeError(errors)
 ovs.append((sl,ov));items[sl]=meta['items']
 if cl is not None:clears.append(cl)
full=w.composite(base,clears,ovs,w.default_patches());full.save(out/'full-set.png');a=np.array(full).astype(np.int32)
tint=np.zeros(a.shape[:2],bool);metrics={};cy=np.arange(a.shape[0])[:,None]%256
for sl,(col,(y0,y1)) in w.OLD_CLOTHES.items():
 dc=np.sqrt(((a[:,:,:3]-np.array(col))**2).sum(-1));ds=np.sqrt(((a[:,:,:3]-np.array(w.SKIN))**2).sum(-1))
 m=(a[:,:,3]>200)&(dc<28)&(dc<ds-15)&(cy>=y0)&(cy<y1);tint|=m
 unchanged=(a[:,:,:3]==base[:,:,:3]).all(-1);metrics[sl]={'colour_matches':int(m.sum()),'exactly_unchanged_base_colour':int((m&unchanged).sum())}
t=a.copy();t[tint]=[255,20,30,255];Image.fromarray(t.astype(np.uint8)).save(out/'colour-diagnostic.png')
for r,name in enumerate(('down','left','right','up')):
 strip=full.crop((0,r*256,2304,(r+1)*256));strip.save(out/f'{name}-256.png');strip.resize((756,84),Image.Resampling.LANCZOS).save(out/f'{name}-84.png')
 frames=[full.crop((c*256,r*256,(c+1)*256,(r+1)*256)).resize((168,168),Image.Resampling.LANCZOS) for c in range(1,9)]
 frames[0].save(out/f'{name}-walk.gif',save_all=True,append_images=frames[1:],duration=125,loop=0,disposal=2)
(out/'metrics.json').write_text(json.dumps({'looks':selected,'items':items,'old_colour_diagnostic':metrics},indent=2)+'\n');print(json.dumps(metrics))
