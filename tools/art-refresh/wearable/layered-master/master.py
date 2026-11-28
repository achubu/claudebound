#!/usr/bin/env python3
"""Lossless authoring master and compatibility compositor. Runtime assets are read-only."""
import argparse,hashlib,importlib.util,io,json,zipfile
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation,binary_fill_holes
ROOT=Path(__file__).resolve().parents[4]
spec=importlib.util.spec_from_file_location('wearable',ROOT/'tools/wearable_add.py');w=importlib.util.module_from_spec(spec);spec.loader.exec_module(w)
NAMES=['body','pants','footwear','torso','belt','head-and-hair','hands','aetherlink']
def digest(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def build(out):
 out=Path(out);out.mkdir(parents=True,exist_ok=True);hero=np.array(Image.open(w.HERO).convert('RGBA'));owner=np.zeros(hero.shape[:2],np.uint8)
 for i,s in ((1,'pants'),(2,'boots'),(3,'shirt'),(4,'belt'),(5,'helmet')):
  mask=np.array(Image.open(ROOT/f'gear/templates/{s}-mask.png').convert('L'))>127;owner[mask&(hero[:,:,3]>0)]=i
 with zipfile.ZipFile(ROOT/'tools/art-refresh/wearable/cyber-gloves-preparation/Gloves-Preparation.zip') as z:hands=np.array(Image.open(io.BytesIO(z.read('hands-mask.png'))).convert('L'))>127
 owner[hands]=6;r,g,b=[hero[:,:,k].astype(float) for k in range(3)];cy=np.arange(1024)[:,None]%256
 cyan=(b>150)&(g>150)&(r<140)&(b-r>60)&(cy>80)&(cy<180)&(hero[:,:,3]>128)
 device=binary_dilation(binary_fill_holes(cyan),iterations=4)&(b>=r-15)&(g>=r-15)&(hero[:,:,3]>0);owner[device]=7
 Image.fromarray(owner).save(out/'ownership.png');planes={}
 for i,name in enumerate(NAMES):
  a=np.zeros_like(hero);a[owner==i]=hero[owner==i];p=out/(name+'.png');Image.fromarray(a).save(p);planes[name]={'file':p.name,'sha256':digest(p)}
 manifest={'format':1,'grid':{'width':2304,'height':1024,'cell':256,'rows':['down','left','right','up'],'frames':9},'original_sha256':digest(w.HERO),'ownership_sha256':digest(out/'ownership.png'),'planes':planes,'editable_planes':[],'requires_underlayer_before_hiding':['head-and-hair','belt','footwear','torso','pants'],'capabilities':{'lossless_default':True,'existing_gear_composition':True,'bald':False,'barefoot':False,'independent_arm_art':False},'note':'Lossless region extraction, not recovered hidden anatomy. Hair and face remain joined until manually reviewed split masks and scalp art exist.'}
 (out/'master.json').write_text(json.dumps(manifest,indent=2)+'\n');assemble(out,out/'reconstructed.png');a=np.array(Image.open(out/'reconstructed.png'));assert np.array_equal(a,hero),'Default reconstruction drift';return manifest

def assemble(folder,dest):
 folder=Path(folder);m=json.loads((folder/'master.json').read_text());owner=np.array(Image.open(folder/'ownership.png'))
 if digest(folder/'ownership.png')!=m['ownership_sha256']:raise ValueError('Ownership mask changed')
 a=np.zeros((1024,2304,4),np.uint8)
 for i,name in enumerate(NAMES):
  p=folder/m['planes'][name]['file']
  if digest(p)!=m['planes'][name]['sha256']:raise ValueError('Plane changed without reviewed manifest')
  plane=np.array(Image.open(p).convert('RGBA'))
  if plane.shape!=a.shape:raise ValueError('Plane size changed')
  a[owner==i]=plane[owner==i]
 Image.fromarray(a).save(dest)

def equip(names,dest):
 known=w.looks();clears=[];overlays=[];slots=set()
 for name in names:
  if name not in known:raise ValueError('Unknown look: '+name)
  meta=known[name];slot=meta['slot']
  if slot in slots:raise ValueError('Duplicate slot: '+slot)
  slots.add(slot);p=Path(w.WEAR)/name;overlays.append((slot,w.rgba(p/'overlay.png')))
  if meta.get('clear'):clears.append(w.rgba(p/'clear.png'))
 w.composite(w.rgba(w.BASE),clears,overlays,w.default_patches()).save(dest)
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);sub=p.add_subparsers(dest='cmd',required=True);b=sub.add_parser('build');b.add_argument('out');a=sub.add_parser('assemble');a.add_argument('folder');a.add_argument('output');e=sub.add_parser('equip');e.add_argument('output');e.add_argument('--looks',nargs='*',default=[]);args=p.parse_args()
 dest=Path(args.out if args.cmd=='build' else args.output).resolve()
 if dest==ROOT/'assets' or ROOT/'assets' in dest.parents:raise ValueError('Art tooling never writes runtime assets')
 if args.cmd=='build':print(json.dumps(build(dest)['capabilities']))
 elif args.cmd=='assemble':assemble(args.folder,dest)
 else:equip(args.looks,dest)
