"""Probe current validation with intentionally invalid synthetic art; no assets written."""
from pathlib import Path
import importlib.util,json
import numpy as np

HERE=Path(__file__).parent
spec=importlib.util.spec_from_file_location('wear',Path(__import__('os').environ.get('WEARABLE_TOOL',str(HERE/'../../../../tools/wearable_add.py'))).resolve());w=importlib.util.module_from_spec(spec);spec.loader.exec_module(w)
w.ROOT=__import__('os').environ.get('WEARABLE_ROOT',w.ROOT)
h=w.rgba(__import__('os').environ.get('HERO_SHEET',w.HERO))
results={}
def check(key,o,clear=None):
    p,past=w.check_look('probe','boots',['boots'],o,clear,h)
    results[key]={'accepted':not p,'past_outline':past,'problems':p}
    assert not p,p

# 36 isolated magenta pixels on the head, declared to be boots.
o=np.zeros_like(h)
for r in range(4):
    for c in range(9):
        region=h[r*256:r*256+70,c*256:(c+1)*256]
        y,x=np.argwhere(region[...,3]==255)[0]
        o[r*256+y,c*256+x]=[255,0,255,255]
check('magenta_pixels_on_head_as_boots',o)

# A tiny pixel well outside the hero still counts as the item's complete frame.
tiny=np.zeros_like(h)
for r in range(4):
    for c in range(9):tiny[r*256+5,c*256+5]=[255,0,255,1]
check('one_alpha1_pixel_per_frame',tiny)

# Dense colored background with alpha 60 bypasses oa > 60.
faint=np.zeros_like(h);faint[:]=[255,0,255,60]
check('full_sheet_magenta_alpha60',faint)

# Change only left-arm bright tech pixels (one in each pose), still declared boots.
tech=np.zeros_like(h)
for r in range(4):
    for c in range(9):
        a=h[r*256+105:r*256+170,c*256:(c+1)*256]
        score=a[...,1]+a[...,2]-2*a[...,0]
        score=np.where(a[...,3]>128,score,-9999)
        y,x=np.unravel_index(score.argmax(),score.shape)
        tech[r*256+105+y,c*256+x]=[255,0,255,255]
check('aetherlink_pixels_as_boots',tech)

# Alpha-identical cleaned source with all visible head colors changed.
clean=h.copy()
for r in range(4):
    band=clean[r*256:r*256+70]
    band[band[...,3]>0,:3]=[0,255,255]
clear=w.clear_from_cleaned(h,clean)
check('head_repaint_in_boots_cleaned_source',o,clear)
results['head_repaint_in_boots_cleaned_source']['changed_pixels']=int((clear[...,3]>0).sum())
print(json.dumps(results,indent=2))
