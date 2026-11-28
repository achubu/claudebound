"""Original actor foreground preservation, independent of corrupted base colours."""
import hashlib,io,json,zipfile
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation,binary_fill_holes
from fit_atlas import ROOT,BASE_HASH,sha
HERO_HASH='5c0e6e4f834f317f193e33202700ae7dbb94e0570a5c2924d48c0a079400fb42'
def masks():
    hp=ROOT/'assets/characters/protagonist-walk9.png'
    if sha(hp)!=HERO_HASH:raise ValueError('Original actor drift; review foreground calibration')
    hero=np.array(Image.open(hp).convert('RGBA'))
    with zipfile.ZipFile(ROOT/'tools/art-refresh/wearable/cyber-gloves-preparation/Gloves-Preparation.zip') as z:
        hands=np.array(Image.open(io.BytesIO(z.read('hands-mask.png'))).convert('L'))>127
    r,g,b=[hero[:,:,k].astype(float) for k in range(3)];cy=np.arange(1024)[:,None]%256
    cyan=(b>150)&(g>150)&(r<140)&(b-r>60)&(cy>80)&(cy<180)&(hero[:,:,3]>128)
    device=binary_dilation(binary_fill_holes(cyan),iterations=4)&(b>=r-15)&(g>=r-15)&(hero[:,:,3]>0)
    # The head is permitted only for helmets. Derive it pose by pose.
    shirt=np.array(Image.open(ROOT/'gear/templates/shirt-mask.png').convert('L'))>127
    head=np.zeros(hands.shape,bool)
    for r in range(4):
        for c in range(9):
            rows=np.where(shirt[r*256:(r+1)*256,c*256:(c+1)*256].any(1))[0]
            if len(rows):head[r*256:r*256+rows.min(),c*256:(c+1)*256]=True
    head &= hero[:,:,3]>0
    return hero,hands,device,head

def preserve(folder,slot):
    """Clip foreground occlusion; merge exact original RGB into a minimal clean patch."""
    folder=Path(folder);bp=ROOT/'assets/characters/protagonist-walk9-base.png'
    if sha(bp)!=BASE_HASH:raise ValueError('Base actor drift')
    base=np.array(Image.open(bp).convert('RGBA'));hero,hands,device,head=masks()
    overlay=np.array(Image.open(folder/'overlay.png').convert('RGBA'))
    if overlay.shape!=base.shape:raise ValueError('Overlay must match 2304x1024 actor grid')
    clean=np.array(Image.open(folder/'cleaned.png').convert('RGBA')) if (folder/'cleaned.png').exists() else base.copy()
    if clean.shape!=base.shape or not np.array_equal(clean[:,:,3],base[:,:,3]):raise ValueError('Cleaned actor changes alpha')
    protected=device.copy()
    if slot!='gloves':protected |= hands
    if slot!='helmet':protected |= head
    removed=int(((overlay[:,:,3]>0)&protected).sum());overlay[protected]=0
    restore=(protected|hands|device)&(hero[:,:,3]>0);clean[restore,:3]=hero[restore,:3]
    # An exposed original head may never be cleaned by another slot.
    if slot!='helmet':clean[head]=base[head]
    changed=(clean[:,:,:3]!=base[:,:,:3]).any(-1)
    Image.fromarray(overlay).save(folder/'overlay.png')
    if changed.any():Image.fromarray(clean).save(folder/'cleaned.png')
    elif (folder/'cleaned.png').exists():(folder/'cleaned.png').unlink()
    manifest=json.loads((folder/'manifest.json').read_text());manifest['cleaned']=bool(changed.any());(folder/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    report={'original_sha256':HERO_HASH,'base_sha256':BASE_HASH,'removed_foreground_pixels':removed,'cleaned_pixels':int(changed.sum()),'slot':slot,'mask_sha256':hashlib.sha256(protected.tobytes()).hexdigest()}
    (folder/'foreground.json').write_text(json.dumps(report,indent=2)+'\n');return report
