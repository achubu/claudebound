#!/usr/bin/env python3
"""One command: directional input -> fitted art -> repository validator -> handoff."""
import argparse,json,shutil,subprocess,sys
from pathlib import Path
from PIL import Image
from calibrate import PARTS
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
    p.add_argument('--slot',choices=PARTS,required=True);p.add_argument('--look',required=True);p.add_argument('--items',required=True);p.add_argument('--out',required=True);a=p.parse_args()
    out=Path(a.out).resolve()
    # This tool prepares art only. Do not allow accidental runtime destinations.
    if out==ROOT/'assets' or ROOT/'assets' in out.parents:raise ValueError('Output must be an art handoff, never assets/')
    out.mkdir(parents=True,exist_ok=True);source=out/'source-atlas.png'
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
    if original:(out/'source-inputs.json').write_text(json.dumps(original,indent=2)+'\n')
    result=subprocess.run([sys.executable,str(ROOT/'tools/wearable_add.py'),'--from',str(out),'--dry-run','--review',str(out/'review')],capture_output=True,text=True)
    (out/'validation.txt').write_text(result.stdout+result.stderr)
    print(result.stdout,end='');print(result.stderr,end='',file=sys.stderr)
    # wearable_add can report NOT ADDED with exit zero: do not trust only its status.
    if result.returncode or 'passes every check; nothing written' not in result.stdout:raise SystemExit('Validation failed; see validation.txt. Do not hand this art off as ready.')
    print('Structural validation passed. Review 256/84px proofs and all walks before integration.')
if __name__=='__main__':main()
