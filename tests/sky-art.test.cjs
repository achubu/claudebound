'use strict';
// Round 583 (owner: "sky isles is too pink, i want it to be more blue and cool steel and vibrant but not pink or purple";
// "some of the art didnt have the green background cut out properly"). The Sky Isles' generator art (recoloured by
// tools/recolor_sky.py from the originals in unused assets/environment/sky-gen-pink/):
//  1. no picture is pink or purple: under 3% of its strongly coloured pixels have a pink/magenta/violet hue;
//  2. no prop keeps the keying green (bright, pure green pixels) except the hydro-house's grow-lights;
//  3. every recoloured picture still has its original kept, so the recolour can be re-run or undone.
const assert = require('assert'), path = require('path'), { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const py = `
import os, json, numpy as np
from PIL import Image
A='assets/environment/sky-gen'; K='unused assets/environment/sky-gen-pink'; out={'pink':[], 'green':[], 'nokeep':[]}
for dp,_,fs in os.walk(A):
  for f in fs:
    if not f.endswith('.webp'): continue
    p=os.path.join(dp,f); rel=os.path.relpath(p,A); a=np.asarray(Image.open(p).convert('RGBA')).astype(float)/255
    rgb,al=a[...,:3],a[...,3]; mx,mn=rgb.max(-1),rgb.min(-1); d=mx-mn; s=np.where(mx>0,d/np.maximum(mx,1e-6),0)
    r,g,b=rgb[...,0],rgb[...,1],rgb[...,2]; h=np.zeros_like(mx); nz=d>1e-6
    hr=nz&(mx==r); hg=nz&(mx==g)&~hr; hb=nz&~hr&~hg
    h[hr]=((g-b)[hr]/d[hr])%6; h[hg]=(b-r)[hg]/d[hg]+2; h[hb]=(r-g)[hb]/d[hb]+4; h*=60
    col=(al>0.5)&(s>0.3)&(mx>0.25)
    if col.sum()>200:
      pk=col&(h>=250)&(h<=345); fr=pk.sum()/col.sum()
      if fr>0.03: out['pink'].append([rel, round(float(fr),3)])
    if rel.startswith('props/') and rel!='props/building-garden/hydro-house.webp':
      gk=(al>0.15)&(g>=0.67)&(g-np.maximum(r,b)>=0.35)
      if gk.sum()>60: out['green'].append([rel, int(gk.sum())])
    if not os.path.exists(os.path.join(K,rel)): out['nokeep'].append(rel)
print(json.dumps(out))`;
const r = spawnSync('python3', ['-c', py], { cwd: ROOT, encoding: 'utf8' });
assert.strictEqual(r.status, 0, r.stderr);
const o = JSON.parse(r.stdout);
assert.deepStrictEqual(o.pink, [], 'no pink or purple Sky Isles art');
assert.deepStrictEqual(o.green, [], 'no keying green left in Sky Isles props');
assert.deepStrictEqual(o.nokeep, [], 'every recoloured picture keeps its original');
console.log('sky-art ok');
