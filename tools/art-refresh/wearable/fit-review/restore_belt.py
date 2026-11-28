#!/usr/bin/env python3
"""Restore original foreground hands/device when a fitted belt hides the default patch."""
import io,json,sys,zipfile
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation,binary_fill_holes
ROOT=Path(__file__).resolve().parents[4];sys.path.insert(0,str(ROOT/'tools'));import wearable_add as w
for name,expected in json.loads((Path(__file__).parent/'source-hashes.json').read_text()).items():
 import hashlib
 if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=expected:raise ValueError('Source drift: '+name)
base=w.rgba(w.BASE).astype(np.uint8);hero=w.rgba(w.HERO).astype(np.uint8)
z=zipfile.ZipFile(ROOT/'tools/art-refresh/wearable/cyber-gloves-preparation/Gloves-Preparation.zip');hands=np.array(Image.open(io.BytesIO(z.read('hands-mask.png'))).convert('L'))>127
r,g,b=[hero[:,:,k].astype(float) for k in range(3)];cy=np.arange(1024)[:,None]%256
cyan=(b>150)&(g>150)&(r<140)&(b-r>60)&(cy>80)&(cy<180)&(hero[:,:,3]>128)
# Original source, not the already partly erased beltless source, defines the device.
region=binary_dilation(binary_fill_holes(cyan),iterations=4)
cool=(b>=r-15)&(g>=r-15)
device=region&cool&(hero[:,:,3]>0)
mask=(hands|device)&(hero[:,:,3]>0)
changed=mask&(base[:,:,:3]!=hero[:,:,:3]).any(-1)
clean=base.copy();clean[changed,:3]=hero[changed,:3]
overlay=w.rgba(Path(w.WEAR)/'cyber-belt/overlay.png').astype(np.uint8);removed=(device|hands)&(overlay[:,:,3]>0);overlay[device|hands]=0
out=Path(__file__).parent/'cyber-belt';out.mkdir(exist_ok=True)
Image.fromarray(clean).save(out/'cleaned.png');Image.fromarray(overlay).save(out/'overlay.png');Image.fromarray((device*255).astype(np.uint8)).save(Path(__file__).parent/'original-device-mask.png')
meta=json.loads((Path(w.WEAR)/'cyber-belt/look.json').read_text());(out/'manifest.json').write_text(json.dumps({'look':'cyber-belt','slot':'belt','items':meta['items'],'cleaned':True},indent=2)+'\n')
assert np.array_equal(clean[:,:,3],base[:,:,3]);assert np.array_equal(clean[~mask],base[~mask])
print(json.dumps({'restored_pixels':int(changed.sum()),'belt_pixels_removed_over_foreground_hands_and_device':int(removed.sum())}))
