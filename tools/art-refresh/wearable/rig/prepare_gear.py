#!/usr/bin/env python3
"""One command: directional input -> fitted art -> repository validator -> handoff."""
import argparse,json,shutil,subprocess,sys
from pathlib import Path
from PIL import Image
from calibrate import PARTS
from foreground import preserve
from fit_atlas import ROOT,build,sha

def pack_views(paths,slot,dest):
    count=len(PARTS[slot]);pieces=[]
    for path in paths:
        im=Image.open(path).convert('RGBA');row=[]
        if im.width<count:raise ValueError('Each view needs one cell per part')
        for i in range(count):row.append(im.crop((i*im.width//count,0,(i+1)*im.width//count,im.height)))
        pieces.append(row)
    cw=max(p.width for row in pieces for p in row);ch=max(p.height for row in pieces for p in row)
    atlas=Image.new('RGBA',(cw*2,ch*2) if count==1 else (cw*count,ch*4))
    for r,row in enumerate(pieces):
        for i,p in enumerate(row):
            x=(r%2)*cw if count==1 else i*cw;y=(r//2)*ch if count==1 else r*ch
            # Pad only, no distortion. Existing cell gutters are required by the fitter.
            atlas.paste(p,(x+(cw-p.width)//2,y+(ch-p.height)//2))
    atlas.save(dest)
def main():
    p=argparse.ArgumentParser(description=__doc__);g=p.add_mutually_exclusive_group(required=True);g.add_argument('--atlas');g.add_argument('--views',nargs=4,metavar=('DOWN','LEFT','RIGHT','UP'))
    p.add_argument('--slot',choices=PARTS,required=True);p.add_argument('--look',required=True);p.add_argument('--items',required=True);p.add_argument('--out',required=True);p.add_argument('--audit-outfits',action='store_true',help='compare all 64 baseline/candidate outfits before issuing the structural marker');a=p.parse_args()
    out=Path(a.out).resolve()
    # This tool prepares art only. Do not allow accidental runtime destinations.
    if out==ROOT/'assets' or ROOT/'assets' in out.parents:raise ValueError('Output must be an art handoff, never assets/')
    out.mkdir(parents=True,exist_ok=True);source=out/'source-atlas.png'
    (out/'READY.json').unlink(missing_ok=True)
    original=[]
    if a.views:
        for name,f in zip(('down','left','right','up'),a.views):
            f=Path(f).resolve();dest=out/f'source-{name}{f.suffix.lower()}'
            if f!=dest:shutil.copyfile(f,dest)
            original.append({'view':name,'file':dest.name,'sha256':sha(dest)})
        pack_views(a.views,a.slot,source)
    elif Path(a.atlas).resolve()!=source:shutil.copyfile(a.atlas,source)
    profiles=Path(__file__).resolve().parent/'profiles'
    build(source,out,a.slot,a.look,a.items.split(','),profiles)
    preserve(out,a.slot)
    if original:(out/'source-inputs.json').write_text(json.dumps(original,indent=2)+'\n')
    base=Image.open(ROOT/'assets/characters/protagonist-walk9-base.png').convert('RGBA')
    clean=Image.open(out/'cleaned.png').convert('RGBA') if (out/'cleaned.png').exists() else base
    # Use repository source-atop compositor, not alpha_composite(clean, overlay), for runtime parity.
    import importlib.util,numpy as np
    spec=importlib.util.spec_from_file_location('wearable',ROOT/'tools/wearable_add.py');w=importlib.util.module_from_spec(spec);spec.loader.exec_module(w)
    ba=np.array(base).astype(np.int16);ov=w.rgba(out/'overlay.png');cl=w.clear_from_cleaned(ba,np.array(clean).astype(np.int16)) if (out/'cleaned.png').exists() else None
    preview=w.composite(ba,[cl] if cl is not None else [],[(a.slot,ov)],w.default_patches());preview.save(out/'preview.png')
    for r,name in enumerate(('down','left','right','up')):
        strip=preview.crop((0,r*256,2304,(r+1)*256));strip.save(out/f'{name}-256.png');strip.resize((756,84),Image.Resampling.LANCZOS).save(out/f'{name}-84.png')
        frames=[preview.crop((c*256,r*256,(c+1)*256,(r+1)*256)).resize((168,168),Image.Resampling.LANCZOS) for c in range(1,9)]
        frames[0].save(out/f'{name}-walk.gif',save_all=True,append_images=frames[1:],duration=125,loop=0,disposal=2)
    result=subprocess.run([sys.executable,str(ROOT/'tools/wearable_add.py'),'--from',str(out),'--dry-run','--review',str(out/'review')],capture_output=True,text=True)
    (out/'validation.txt').write_text(result.stdout+result.stderr)
    print(result.stdout,end='');print(result.stderr,end='',file=sys.stderr)
    # wearable_add can report NOT ADDED with exit zero: do not trust only its status.
    if result.returncode or 'passes every check; nothing written' not in result.stdout:raise SystemExit('Validation failed; see validation.txt. Do not hand this art off as ready.')
    outfit_status=None
    if a.audit_outfits:
        from audit_outfits import audit
        outfit_status=audit(out,out/'outfits.json')
        if outfit_status['new_regressions']:raise SystemExit('Outfit preservation regressed; see outfits.json. No READY marker issued.')
    (out/'READY.json').write_text(json.dumps({'structural_validation':'passed','visual_review':'required','outfit_audit':{k:v for k,v in outfit_status.items() if k!='outfits'} if outfit_status else 'not run','overlay_sha256':sha(out/'overlay.png'),'cleaned_sha256':sha(out/'cleaned.png') if (out/'cleaned.png').exists() else None},indent=2)+'\n')
    print('Structural validation passed. Review 256/84px proofs and all walks before integration.')
if __name__=='__main__':main()
