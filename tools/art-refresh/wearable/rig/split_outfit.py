#!/usr/bin/env python3
"""Four registered complete-outfit views -> reviewable directional equipment parts.
Never invents material hidden behind another slot; does not produce production overlays.
"""
import argparse,json
from pathlib import Path
import numpy as np
from PIL import Image
from calibrate import PARTS,calibration
from foreground import masks
from fit_atlas import ROOT,BASE_HASH,sha
VIEWS=('down','left','right','up');ORDER=('pants','boots','shirt','belt','gloves','helmet')
def registered(path):
    im=Image.open(path).convert('RGBA')
    if im.size!=(256,256):raise ValueError('Every view must be a registered 256x256 canonical idle frame; use the supplied guide')
    return np.array(im)
def split(paths,out,underlayers=None):
    out=Path(out);out.mkdir(parents=True,exist_ok=True);(out/'READY.json').unlink(missing_ok=True)
    source=[registered(p) for p in paths];hero,hands,device,head=masks();labels={s:calibration(s) for s in ORDER};missing={};outputs={};underlayers=underlayers or {}
    for s in ORDER:
        count=len(PARTS[s]);atlas=Image.new('RGBA',(512,512) if count==1 else (count*256,1024));slot_report=[]
        for r,view in enumerate(VIEWS):
            lab=labels[s][r*256:(r+1)*256,:256].copy();protect=device[r*256:(r+1)*256,:256].copy()
            if s!='gloves':protect|=hands[r*256:(r+1)*256,:256]
            if s!='helmet':protect|=head[r*256:(r+1)*256,:256]
            lab[protect]=0;wanted=lab>0;covered=np.zeros((256,256),bool)
            for higher in ORDER[ORDER.index(s)+1:]:covered|=labels[higher][r*256:(r+1)*256,:256]>0
            hidden=wanted&covered;visible=wanted&~covered
            pixels=np.zeros_like(source[r]);pixels[visible]=source[r][visible]
            if s in underlayers:
                patch=registered(underlayers[s][r]);valid=hidden&(patch[:,:,3]>=160);pixels[valid]=patch[valid]
            unresolved=wanted&(pixels[:,:,3]<160)
            slot_report.append({'view':view,'hidden_pixels':int(hidden.sum()),'missing_pixels':int(unresolved.sum())})
            Image.fromarray((unresolved*255).astype('uint8')).save(out/f'{s}-{view}-missing.png')
            for i in range(count):
                part=pixels.copy();part[lab!=i+1]=0
                if count==1:xy=((r%2)*256,(r//2)*256)
                else:xy=(i*256,r*256)
                im=Image.fromarray(part);bbox=im.getbbox()
                if bbox:
                    im=im.crop(bbox);im.thumbnail((192,192),Image.Resampling.LANCZOS);atlas.paste(im,(xy[0]+(256-im.width)//2,xy[1]+(256-im.height)//2))
        dest=out/s;dest.mkdir(exist_ok=True);atlas.save(dest/'source-atlas.png');missing[s]=slot_report;outputs[s]=str((dest/'source-atlas.png').relative_to(out))
    report={'base_sha256':BASE_HASH,'source_sha256':[sha(p) for p in paths],'canonical_frame':0,'views':VIEWS,'slot_order':ORDER,'sources':outputs,'slots':missing,'missing_pixels':sum(v['missing_pixels'] for rows in missing.values() for v in rows),'status':'visible-only: underlayers required' if any(v['missing_pixels'] for rows in missing.values() for v in rows) else 'extracted: visual review required','production_ready':False}
    (out/'outfit.json').write_text(json.dumps(report,indent=2)+'\n');return report

def guides(out):
    out=Path(out);out.mkdir(parents=True,exist_ok=True);base=Image.open(ROOT/'assets/characters/protagonist-walk9-base.png').convert('RGBA');palette=[(110,85,180,220),(50,150,190,220),(100,180,110,220),(240,170,60,220),(220,90,140,220),(110,140,230,220)]
    for r,v in enumerate(VIEWS):
        base.crop((0,r*256,256,(r+1)*256)).save(out/f'{v}-actor.png');canvas=Image.new('RGBA',(256,256))
        for s,col in zip(ORDER,palette):
            a=np.zeros((256,256,4),dtype='uint8');a[calibration(s)[r*256:(r+1)*256,:256]>0]=col;canvas.alpha_composite(Image.fromarray(a))
        canvas.save(out/f'{v}-slots.png')
    (out/'prompt.txt').write_text('Create four independent complete-outfit views using the matching original actor images as registered pose references: front/down, left, right, back/up. Keep each 256x256 frame camera, scale and exact body position. Design ONE coherent armor set: helmet, chest, gloves, belt, trousers, boots. Keep the original face/skin/fingers and anatomical LEFT Aetherlink unchanged. No extra pouches, weapons, ground, shadows or text. Use true transparency. The coloured masks are spatial guides, not colours to reproduce. Also supply separate aligned underlayer images for material concealed by other items: full waistband under belt, chest lower hem under belt, leg material behind boots. These must show actual designed material, not transparent holes or invented filler. Each direction is drawn independently.\n')
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--views',nargs=4);p.add_argument('--out',required=True);p.add_argument('--underlayers',help='JSON mapping slot to four registered patch PNGs, paths relative to JSON');p.add_argument('--guides',action='store_true');a=p.parse_args()
    if a.guides:guides(a.out)
    else:
        if not a.views:p.error('--views front left right back required')
        under={}
        if a.underlayers:
            file=Path(a.underlayers);under={s:[str(file.parent/q) for q in paths] for s,paths in json.loads(file.read_text()).items()}
            if any(s not in ORDER or len(paths)!=4 for s,paths in under.items()):p.error('Underlayers require a known slot and exactly four PNG paths')
        result=split(a.views,a.out,under);print(json.dumps({k:result[k] for k in ('status','missing_pixels','production_ready')}))
