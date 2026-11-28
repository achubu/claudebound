#!/usr/bin/env python3
"""Read-only baseline/candidate audit over all 64 outfits, 36 frames each."""
import argparse,itertools,json,sys,importlib.util
from pathlib import Path
import numpy as np
from PIL import Image
from foreground import masks
from fit_atlas import ROOT
spec=importlib.util.spec_from_file_location('wearable',ROOT/'tools/wearable_add.py');w=importlib.util.module_from_spec(spec);spec.loader.exec_module(w)
def audit(folder,output):
 folder=Path(folder);manifest=json.loads((folder/'manifest.json').read_text());slot=manifest['slot'];base=w.rgba(w.BASE);hero,hands,device,head=masks();hero=hero.astype(np.int16)
 r,g,b=[hero[:,:,k].astype(float) for k in range(3)];skin=hands&(r>130)&(r>g*1.32)&(g>b*1.2)&(g>65)&(hero[:,:,3]>200);core=device&(b>150)&(g>150)&(r<140)&(b-r>60)&(hero[:,:,3]>200)
 selected={v['slot']:n for n,v in w.looks().items()};slots=w.SLOTS;assets={}
 for s,n in selected.items():
  p=Path(w.WEAR)/n;m=w.looks()[n];assets[s]=(w.rgba(p/'overlay.png'),w.rgba(p/'clear.png') if m.get('clear') else None)
 candidate=(w.rgba(folder/'overlay.png'),w.clear_from_cleaned(base,w.rgba(folder/'cleaned.png')) if manifest.get('cleaned') else None);rows=[]
 defaults=w.default_patches()
 for bits in itertools.product((0,1),repeat=len(slots)):
  active=[s for s,on in zip(slots,bits) if on];scores=[]
  for replace in (False,True):
   art={s:(candidate if replace and s==slot else assets[s]) for s in active};a=np.array(w.composite(base,[v[1] for v in art.values() if v[1] is not None],[(s,v[0]) for s,v in art.items()],defaults)).astype(np.int16);diff=(np.abs(a[:,:,:3]-hero[:,:,:3])>3).any(-1);covered=art['gloves'][0][:,:,3]>0 if 'gloves' in art else np.zeros(hands.shape,bool)
   scores.append({'hands':int((diff&skin&~covered).sum()),'device_core':int((diff&core).sum()),'face':int((diff&head&(hero[:,:,3]>200)).sum()) if 'helmet' not in active else 0})
  rows.append({'slots':active,'baseline':scores[0],'candidate':scores[1],'regressions':{k:max(0,scores[1][k]-scores[0][k]) for k in scores[0]}})
 result={'combinations':len(rows),'frames_each':36,'rgb_tolerance':3,'new_regressions':sum(any(v>0 for v in row['regressions'].values()) for row in rows),'outfits_with_existing_or_candidate_issues':sum(any(v>0 for v in row['candidate'].values()) for row in rows),'outfits':rows};Path(output).write_text(json.dumps(result,indent=2)+'\n');return result
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('folder');p.add_argument('output');a=p.parse_args();r=audit(a.folder,a.output);print(json.dumps({k:v for k,v in r.items() if k!='outfits'}));sys.exit(1 if r['new_regressions'] else 0)
