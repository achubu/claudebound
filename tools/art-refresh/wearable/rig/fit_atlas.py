#!/usr/bin/env python3
"""Fit independently drawn directional equipment parts to the locked actor grid.
Single part: 2x2; articulated equipment: four directional rows x part columns.
"""
import argparse, hashlib, json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label, binary_dilation
ROOT=Path(__file__).resolve().parents[4]
BASE_HASH='a1317e9671b0da27e75edee3268cc6a6723ccc140c8b1bdac3f48ee7ea00ba2f'
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def build(source,out,slot,look,items,profile_dir=None):
    from calibrate import PARTS, calibration
    basepath=ROOT/'assets/characters/protagonist-walk9-base.png'
    if sha(basepath)!=BASE_HASH: raise ValueError('Actor changed: recalibration required')
    base=Image.open(basepath).convert('RGBA'); ba=np.asarray(base)
    atlas=Image.open(source).convert('RGBA'); w,h=atlas.size
    count=len(PARTS[slot]); parts=[]
    if profile_dir:
        profile=Path(profile_dir); meta=json.loads((profile/f'{slot}.json').read_text())
        if meta['protected_sha256']!=sha(ROOT/'gear/templates/protected.png') or meta['base_sha256']!=BASE_HASH or meta['template_sha256']!=sha(ROOT/f'gear/templates/{slot}-mask.png') or meta['labels_sha256']!=sha(profile/f'{slot}-parts.png'):
            raise ValueError('Calibration hash drift: review and recalibrate')
        labels=np.array(Image.open(profile/f'{slot}-parts.png').convert('L'))
    else: labels=calibration(slot)
    if labels.shape!=(1024,2304) or set(np.unique(labels))!=set(range(count+1)):
        raise ValueError('Bad part calibration')
    for r in range(4):
        view=[]
        for i in range(count):
            # Single-part inputs retain the compact 2x2 contract.
            if count==1: box=((r%2)*w//2,(r//2)*h//2,(r%2+1)*w//2,(r//2+1)*h//2)
            else: box=(i*w//count,r*h//4,(i+1)*w//count,(r+1)*h//4)
            part=atlas.crop(box); a=np.array(part)
            edge=np.concatenate((a[0,:,3],a[-1,:,3],a[:,0,3],a[:,-1,3]))
            if (edge>=160).mean()>.05: raise ValueError('Opaque cell boundary: transparent gutters required')
            components,n=label(a[:,:,3]>=160)
            if not n: raise ValueError(f'Empty source view {r}, part {i}')
            sizes=np.bincount(components.ravel()); sizes[0]=0; keep=components==sizes.argmax()
            if (sizes.sum()-sizes.max())>max(20,sizes.sum()*.02):
                raise ValueError('Disconnected source art: supply one connected part per cell')
            a[~keep]=0; ys,xs=np.where(keep)
            view.append(Image.fromarray(a).crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1)))
        parts.append(view)
    target=labels>0
    overlay=Image.new('RGBA',base.size); placements=[]; cleaned=np.array(base)
    for r in range(4):
        for c in range(9):
            cell_labels=labels[r*256:(r+1)*256,c*256:(c+1)*256]
            for i in range(count):
                m=cell_labels==i+1; ys,xs=np.where(m)
                if not len(xs): continue  # This part is fully occluded in this pose.
                x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
                p=parts[r][i]; scale=max((x1-x0)/p.width,(y1-y0)/p.height)*1.15
                for attempt in range(24):
                    size=(round(p.width*scale),round(p.height*scale))
                    if max(size)>240: raise ValueError('Source cannot cover calibrated mask')
                    resized=p.resize(size,Image.Resampling.LANCZOS)
                    xy=(round((x0+x1-size[0])/2),round((y0+y1-size[1])/2))
                    cell=Image.new('RGBA',(256,256)); cell.paste(resized,xy); arr=np.array(cell)
                    if np.all(arr[:,:,3][m]>=128): break
                    scale*=1.06
                else: raise ValueError('Source has holes over target')
                edge=m & (ba[r*256:(r+1)*256,c*256:(c+1)*256,3]<128)
                clean_cell=cleaned[r*256:(r+1)*256,c*256:(c+1)*256]
                clean_cell[edge,:3]=arr[edge,:3]
                arr[~m]=0; arr[m,3]=255; arr[edge]=0
                # Each labelled target is disjoint; preserve already fitted parts.
                old=np.array(overlay.crop((c*256,r*256,(c+1)*256,(r+1)*256)))
                old[m]=arr[m]; overlay.paste(Image.fromarray(old),(c*256,r*256))
                placements.append({'row':r,'frame':c,'part':PARTS[slot][i],'xy':xy,'size':size})
    out=Path(out); out.mkdir(parents=True,exist_ok=True); overlay.save(out/'overlay.png')
    needs_clean = not np.array_equal(cleaned,ba)
    if needs_clean: Image.fromarray(cleaned).save(out/'cleaned.png')
    elif (out/'cleaned.png').exists(): (out/'cleaned.png').unlink()
    preview=Image.alpha_composite(Image.fromarray(cleaned),overlay); preview.save(out/'preview.png')
    assert np.array_equal(np.asarray(preview)[~target],ba[~target]),'Uncovered actor pixels changed'
    (out/'manifest.json').write_text(json.dumps(dict(look=look,slot=slot,items=items,cleaned=needs_clean),indent=2)+'\n')
    (out/'build.json').write_text(json.dumps(dict(base_sha256=sha(basepath),source_sha256=sha(source),mask_sha256=sha(ROOT/f'gear/templates/{slot}-mask.png'),protected_sha256=sha(ROOT/'gear/templates/protected.png'),labels_sha256=hashlib.sha256(labels.tobytes()).hexdigest(),views=['down','left','right','up'],placements=placements),indent=2)+'\n')
    for r,name in enumerate(('down','left','right','up')):
        strip=preview.crop((0,r*256,2304,(r+1)*256)); strip.save(out/f'{name}-256.png'); strip.resize((756,84),Image.Resampling.LANCZOS).save(out/f'{name}-84.png')
        frames=[preview.crop((c*256,r*256,(c+1)*256,(r+1)*256)).resize((168,168),Image.Resampling.LANCZOS) for c in range(1,9)]
        frames[0].save(out/f'{name}-walk.gif',save_all=True,append_images=frames[1:],duration=125,loop=0,disposal=2)
if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__); ap.add_argument('source'); ap.add_argument('output'); ap.add_argument('--slot',choices=['helmet','belt','shirt','pants','boots','gloves'],required=True); ap.add_argument('--look',required=True); ap.add_argument('--items',required=True); ap.add_argument('--profiles'); a=ap.parse_args()
    build(a.source,a.output,a.slot,a.look,a.items.split(','),a.profiles)
