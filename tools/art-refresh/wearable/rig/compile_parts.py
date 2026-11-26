#!/usr/bin/env python3
"""Offline gear-only compiler. Never regenerates, resizes or writes the hero base."""
import argparse, hashlib, json
from pathlib import Path
from PIL import Image

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def build(recipe_path, out_dir):
    recipe_path=Path(recipe_path).resolve(); root=recipe_path.parent
    r=json.loads(recipe_path.read_text())
    if r.get('schema') != 1 or r.get('calibration_reviewed') is not True:
        raise ValueError('schema 1 and human-reviewed calibration are required')
    base_path=(root/r['base']).resolve()
    if digest(base_path) != r['base_sha256']:
        raise ValueError('Base hash changed: recalibrate explicitly')
    base=Image.open(base_path).convert('RGBA')
    if base.size != (2304,1024): raise ValueError('Expected original 2304x1024 grid')
    canvas=Image.new('RGBA',base.size)
    for part in r['parts']:
        source_path=(root/part['image']).resolve()
        if digest(source_path) != part['sha256']: raise ValueError('Part source hash changed')
        source=Image.open(source_path).convert('RGBA')
        frames=part['frames']
        if len(frames)!=36: raise ValueError('Every part needs 36 calibrated placements (hidden allowed)')
        mask=None
        if part.get('visible_mask'):
            mask=Image.open(root/part['visible_mask']).convert('L')
            if mask.size != base.size: raise ValueError('Mask grid mismatch')
            if digest(root/part['visible_mask']) != part['visible_mask_sha256']:
                raise ValueError('Mask hash changed')
        for index,f in enumerate(frames):
            if f.get('hidden'): continue
            row,col=divmod(index,9)
            view=part['views'][['down','left','right','up'][row]]
            box=view['crop']; x0,y0,x1,y1=box
            if not (0<=x0<x1<=source.width and 0<=y0<y1<=source.height):
                raise ValueError('Atlas crop outside source')
            patch=source.crop(box)
            scale=float(f['scale'])
            if not 0<scale<=8: raise ValueError('Invalid scale')
            # One uniform scale; never stretch or mirror a directional drawing.
            size=(max(1,round(patch.width*scale)),max(1,round(patch.height*scale)))
            patch=patch.resize(size,Image.Resampling.LANCZOS)
            pivot=view['pivot']; target=f['anchor']
            px=round(target[0]-pivot[0]*scale); py=round(target[1]-pivot[1]*scale)
            if not (0<=px and 0<=py and px+size[0]<=256 and py+size[1]<=256):
                raise ValueError(f'Part clips cell {row},{col}; recalibrate')
            layer=Image.new('RGBA',(256,256));layer.alpha_composite(patch,(px,py))
            if mask:
                from PIL import ImageChops
                m=mask.crop((col*256,row*256,(col+1)*256,(row+1)*256))
                layer.putalpha(ImageChops.multiply(layer.getchannel('A'),m))
            canvas.alpha_composite(layer,(col*256,row*256))
    out_dir=Path(out_dir).resolve()
    if out_dir==base_path.parent or base_path.is_relative_to(out_dir):
        raise ValueError('Output directory must be separate from immutable base')
    out_dir.mkdir(parents=True,exist_ok=True)
    overlay=out_dir/'overlay.png'; canvas.save(overlay,optimize=True)
    comp=Image.alpha_composite(base,canvas);comp.save(out_dir/'preview.png')
    # Compare at pixels where no gear was drawn, not a perceptual similarity score.
    import numpy as np
    a=np.asarray(canvas); b=np.asarray(base); c=np.asarray(comp)
    if not np.array_equal(b[a[...,3]==0],c[a[...,3]==0]):
        raise AssertionError('Uncovered hero pixels changed')
    if digest(base_path)!=r['base_sha256']: raise AssertionError('Base was modified')
    for row,direction in enumerate(['down','left','right','up']):
        strip=comp.crop((0,row*256,2304,(row+1)*256))
        strip.save(out_dir/f'{direction}-256.png')
        strip.resize((756,84),Image.Resampling.LANCZOS).save(out_dir/f'{direction}-84.png')
    report={'base_sha256':r['base_sha256'],'recipe_sha256':digest(recipe_path),
            'overlay_sha256':digest(overlay),'uncovered_pixels_identical':True,
            'base_modified':False,'validation':'compiler invariants only; run wearable_add and Gear Studio next'}
    (out_dir/'build.json').write_text(json.dumps(report,indent=2))
    return report

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('recipe');p.add_argument('--out',required=True)
    a=p.parse_args();print(json.dumps(build(a.recipe,a.out),indent=2))
