import json,sys,tempfile,unittest
from pathlib import Path
import numpy as np
from PIL import Image
sys.path.insert(0,str(Path(__file__).parent))
from split_outfit import split,ORDER
class Split(unittest.TestCase):
 def test_hidden_regions_are_flagged_then_completed(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);paths=[]
   for r in range(4):
    p=root/f'{r}.png';Image.new('RGBA',(256,256),(50+r*20,90,120,255)).save(p);paths.append(p)
   a=split(paths,root/'visible');self.assertGreater(a['missing_pixels'],0);self.assertFalse(a['production_ready']);self.assertFalse((root/'visible/READY.json').exists())
   b=split(paths,root/'filled',{s:paths for s in ORDER});self.assertEqual(b['missing_pixels'],0);self.assertFalse(b['production_ready'])
   for slot,rel in b['sources'].items():
    im=np.array(Image.open(root/'filled'/rel));self.assertFalse(im[0,:,3].any());self.assertFalse(im[-1,:,3].any());self.assertFalse(im[:,0,3].any());self.assertFalse(im[:,-1,3].any())
 def test_unregistered_source_refused(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp)/'bad.png';Image.new('RGBA',(512,512)).save(p)
   with self.assertRaisesRegex(ValueError,'registered'):split([p]*4,Path(tmp)/'out')
if __name__=='__main__':unittest.main()
