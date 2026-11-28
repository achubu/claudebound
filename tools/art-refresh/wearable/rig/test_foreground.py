import json,sys,tempfile,unittest
from pathlib import Path
import numpy as np
from PIL import Image
sys.path.insert(0,str(Path(__file__).parent))
from foreground import preserve,masks
from fit_atlas import ROOT
class Foreground(unittest.TestCase):
 def test_every_slot_and_glove_exception(self):
  hero,hands,device,head=masks();base=np.array(Image.open(ROOT/'assets/characters/protagonist-walk9-base.png').convert('RGBA'))
  for slot in ('pants','boots','shirt','belt','gloves','helmet'):
   with self.subTest(slot=slot),tempfile.TemporaryDirectory() as t:
    p=Path(t);ov=np.zeros_like(base);ov[base[:,:,3]>0]=[50,70,100,255];Image.fromarray(ov).save(p/'overlay.png');(p/'manifest.json').write_text(json.dumps({'look':'fixture','slot':slot,'items':['fixture'],'cleaned':False}))
    preserve(p,slot);a=np.array(Image.open(p/'overlay.png'));clean=np.array(Image.open(p/'cleaned.png'))
    self.assertFalse(a[device,3].any())
    if slot!='gloves':self.assertFalse(a[hands,3].any())
    if slot!='helmet':self.assertFalse(a[head,3].any())
    self.assertTrue(np.array_equal(clean[:,:,3],base[:,:,3]));self.assertTrue(np.array_equal(clean[hands|device,:3],hero[hands|device,:3]))
    first=a.copy();preserve(p,slot);self.assertTrue(np.array_equal(first,np.array(Image.open(p/'overlay.png'))))
 def test_bad_clean_alpha_refused(self):
  with tempfile.TemporaryDirectory() as t:
   p=Path(t);base=Image.open(ROOT/'assets/characters/protagonist-walk9-base.png').convert('RGBA');base.save(p/'overlay.png');bad=np.array(base);bad[0,0,3]=255;Image.fromarray(bad).save(p/'cleaned.png');(p/'manifest.json').write_text('{}')
   with self.assertRaisesRegex(ValueError,'alpha'):preserve(p,'belt')
if __name__=='__main__':unittest.main()
