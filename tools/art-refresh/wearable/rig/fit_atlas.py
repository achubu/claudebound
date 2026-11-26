#!/usr/bin/env python3
"""Fit four directional, equipment-only images to a locked single-part slot mask.
Supports helmet and belt. Multi-joint garments require separate part calibration.
"""
import argparse, hashlib, json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label
ROOT=Path(__file__).resolve().parents[4]
BASE_HASH='a1317e9671b0da27e75edee3268cc6a6723ccc140c8b1bdac3f48ee7ea00ba2f'
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def build(source,out,slot,look,items):
    basepath=ROOT/'assets/characters/protagonist-walk9-base.png'
    if sha(basepath)!=BASE_HASH: raise ValueError('Actor changed: recalibration required')
    base=Image.open(basepath).convert('RGBA'); ba=np.asarray(base)
    atlas=Image.open(source).convert('RGBA'); w,h=atlas.size
    parts=[]
    for r,c in ((0,0),(0,1),(1,0),(1,1)):
        part=atlas.crop((c*w//2,r*h//2,(c+1)*w//2,(r+1)*h//2)); a=np.array(part)
        edge=np.concatenate((a[0,:,3],a[-1,:,3],a[:,0,3],a[:,-1,3]))
        if (edge>=160).mean()>.05: raise ValueError('Opaque cell boundary: transparent gutters required')
        components,n=label(a[:,:,3]>=160)
        if not n: raise ValueError('Empty source view')
        sizes=np.bincount(components.ravel()); sizes[0]=0
        keep=components==sizes.argmax(); a[~keep]=0
        ys,xs=np.where(keep); parts.append(Image.fromarray(a).crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1)))
    target=np.asarray(Image.open(ROOT/f'gear/templates/{slot}-mask.png').convert('L'))>128
    target &= ba[:,:,3]>=128
    target &= np.asarray(Image.open(ROOT/'gear/templates/protected.png').convert('L'))<=127
    overlay=Image.new('RGBA',base.size); placements=[]
    for r in range(4):
        for c in range(9):
            m=target[r*256:(r+1)*256,c*256:(c+1)*256]; ys,xs=np.where(m)
            if not len(xs): raise ValueError('Empty calibrated frame')
            x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
            p=parts[r]; scale=max((x1-x0)/p.width,(y1-y0)/p.height)*1.15
            for attempt in range(24):
                size=(round(p.width*scale),round(p.height*scale))
                if max(size)>240: raise ValueError('Source cannot cover calibrated mask')
                resized=p.resize(size,Image.Resampling.LANCZOS)
                xy=(round((x0+x1-size[0])/2),round((y0+y1-size[1])/2))
                cell=Image.new('RGBA',(256,256)); cell.paste(resized,xy); arr=np.array(cell)
                if np.all(arr[:,:,3][m]>=128): break
                scale*=1.06
            else: raise ValueError('Source has holes over target')
            arr[~m]=0; arr[m,3]=255
            overlay.paste(Image.fromarray(arr),(c*256,r*256)); placements.append({'row':r,'frame':c,'xy':xy,'size':size})
    out=Path(out); out.mkdir(parents=True,exist_ok=True); overlay.save(out/'overlay.png')
    preview=Image.alpha_composite(base,overlay); preview.save(out/'preview.png')
    assert np.array_equal(np.asarray(preview)[~target],ba[~target]),'Uncovered actor pixels changed'
    (out/'manifest.json').write_text(json.dumps(dict(look=look,slot=slot,items=items,cleaned=False),indent=2)+'\n')
    (out/'build.json').write_text(json.dumps(dict(base_sha256=sha(basepath),source_sha256=sha(source),mask_sha256=sha(ROOT/f'gear/templates/{slot}-mask.png'),views=['down','left','right','up'],placements=placements),indent=2)+'\n')
    for r,name in enumerate(('down','left','right','up')):
        strip=preview.crop((0,r*256,2304,(r+1)*256)); strip.save(out/f'{name}-256.png'); strip.resize((756,84),Image.Resampling.LANCZOS).save(out/f'{name}-84.png')
        frames=[preview.crop((c*256,r*256,(c+1)*256,(r+1)*256)).resize((168,168),Image.Resampling.LANCZOS) for c in range(1,9)]
        frames[0].save(out/f'{name}-walk.gif',save_all=True,append_images=frames[1:],duration=125,loop=0,disposal=2)
if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__); ap.add_argument('source'); ap.add_argument('output'); ap.add_argument('--slot',choices=['helmet','belt'],required=True); ap.add_argument('--look',required=True); ap.add_argument('--items',required=True); a=ap.parse_args()
    build(a.source,a.output,a.slot,a.look,a.items.split(','))
