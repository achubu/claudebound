#!/usr/bin/env python3
"""Build hash-pinned masks and generation guides from approved slot templates."""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import binary_dilation
from fit_atlas import ROOT, BASE_HASH, sha
PARTS={'helmet':['shell'],'belt':['strap'],'shirt':['torso','screen-left shoulder','screen-right shoulder'],'pants':['waist','screen-left thigh','screen-right thigh','screen-left shin','screen-right shin'],'boots':['screen-left boot','screen-right boot'],'gloves':['anatomical-left glove','anatomical-right glove']}
def calibration(slot):
    bp=ROOT/'assets/characters/protagonist-walk9-base.png'
    if sha(bp)!=BASE_HASH: raise ValueError('Actor changed: recalibration required')
    b=np.array(Image.open(bp).convert('RGBA')); mask=np.array(Image.open(ROOT/f'gear/templates/{slot}-mask.png').convert('L'))>128
    prot=np.array(Image.open(ROOT/'gear/templates/protected.png').convert('L'))>127
    if slot=='helmet': mask=binary_dilation(mask,iterations=2)&(b[:,:,3]>0)
    else: mask &= b[:,:,3]>=128
    mask &= ~prot; labels=np.zeros(mask.shape,np.uint8)
    yy,xx=np.indices((256,256))
    for r in range(4):
        for c in range(9):
            q=mask[r*256:(r+1)*256,c*256:(c+1)*256]; y,x=np.where(q)
            if not len(x): raise ValueError('Empty slot frame')
            t=labels[r*256:(r+1)*256,c*256:(c+1)*256]; t[q]=1
            if slot=='shirt':
                waist=x[y>y.max()-8]; lo,hi=np.quantile(waist,[.1,.9]); upper=yy<y.min()+(y.max()-y.min())*.55
                t[q & upper & (xx<lo)]=2; t[q & upper & (xx>hi)]=3
            if slot in ('pants','boots','gloves'):
                centers=np.quantile(x,[.2,.8])
                for _ in range(15):
                    which=np.abs(x[:,None]-centers).argmin(1)
                    for i in range(2):
                        if np.any(which==i): centers[i]=x[which==i].mean()
                screenleft=np.abs(xx-centers[0])<=np.abs(xx-centers[1])
                first=screenleft
                if slot=='gloves':
                    py,px=np.where(prot[r*256:(r+1)*256,c*256:(c+1)*256])
                    if len(px):
                        first=screenleft if abs(px.mean()-centers[0])<abs(px.mean()-centers[1]) else ~screenleft
                    else:
                        # Occluded Aetherlink: direction convention, symmetric glove kits only.
                        first=screenleft if r==3 else ~screenleft
                t[q&first]=1; t[q&~first]=2
                if slot=='pants':
                    waist=yy<y.min()+max(10,(y.max()-y.min())*.13); lower=yy>=y.min()+(y.max()-y.min())*.55
                    t[q&first&~waist&~lower]=2; t[q&~first&~waist&~lower]=3
                    t[q&first&~waist&lower]=4; t[q&~first&~waist&lower]=5; t[q&waist]=1
    return labels

def save(slot,out):
    out=Path(out);out.mkdir(parents=True,exist_ok=True);lab=calibration(slot); Image.fromarray(lab).save(out/f'{slot}-parts.png')
    count=len(PARTS[slot]);guide=Image.new('RGBA',(count*256,4*256));d=ImageDraw.Draw(guide)
    for r,view in enumerate(('down','left','right','up')):
        for i,name in enumerate(PARTS[slot],1):
            m=lab[r*256:(r+1)*256,:256]==i
            for c in range(1,9):
                if m.any(): break
                m=lab[r*256:(r+1)*256,c*256:(c+1)*256]==i
            y,x=np.where(m)
            d.text(((i-1)*256+8,r*256+8),view+' / '+name,fill='white')
            if not len(x): continue
            tile=Image.fromarray((m[y.min():y.max()+1,x.min():x.max()+1]*255).astype('uint8'))
            tile.thumbnail((170,170)); tint=Image.new('RGBA',tile.size,(90,170,200,255));tint.putalpha(tile)
            guide.alpha_composite(tint,((i-1)*256+(256-tile.width)//2,r*256+42+(180-tile.height)//2));d.text(((i-1)*256+8,r*256+8),view+' / '+name,fill='white')
    guide.save(out/f'{slot}-guide.png')
    (out/f'{slot}.json').write_text(json.dumps({'slot':slot,'parts':PARTS[slot],'base_sha256':BASE_HASH,'labels_sha256':sha(out/f'{slot}-parts.png'),'template_sha256':sha(ROOT/f'gear/templates/{slot}-mask.png'),'protected_sha256':sha(ROOT/'gear/templates/protected.png'),'views':['down','left','right','up'],'source_layout':'4 rows x part-count columns; helmet/belt also accept 2x2'},indent=2)+'\n')
    (out/f'{slot}-prompt.txt').write_text(f'Create equipment-only art matching the attached {slot} guide. Four rows in order: front/down, left-facing, right-facing, rear/up. Each row has {count} equal columns: '+', '.join(PARTS[slot])+'. Draw each part isolated in its own cell, generous transparent gutters, no actor, skin, hair, text, ground or shadow. Same material/design/scale across views; each direction independently drawn. Preserve curved junctions with generous overlap material for fitting. Actual transparent PNG. The labels in the guide are instructions, not artwork. For paired legs/boots use symmetric designs; screen-left/right are visible-position tracks, not persistent anatomical identities. Gloves leave original fingers visible and never extend onto the forearm Aetherlink.\n')
if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('output');p.add_argument('--slot',choices=list(PARTS));a=p.parse_args()
    for s in ([a.slot] if a.slot else PARTS):save(s,a.output)
