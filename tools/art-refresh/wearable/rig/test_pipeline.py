#!/usr/bin/env python3
"""Structural fixtures, never production gear art. Run with unittest from repo root."""
import importlib.util, json, sys, tempfile, unittest
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
sys.path.insert(0,str(Path(__file__).resolve().parent))
from fit_atlas import ROOT,build,sha
from calibrate import PARTS,save,calibration
spec=importlib.util.spec_from_file_location('wearable',ROOT/'tools/wearable_add.py');wear=importlib.util.module_from_spec(spec);spec.loader.exec_module(wear)
class Pipeline(unittest.TestCase):
    def fixture(self,slot,path):
        n=len(PARTS[slot]);im=Image.new('RGBA',(512,512) if n==1 else (n*256,1024));d=ImageDraw.Draw(im)
        for r in range(4):
            for i in range(n):
                x=(r%2)*256 if n==1 else i*256;y=(r//2)*256 if n==1 else r*256
                d.rectangle((x+24,y+24,x+231,y+231),fill=(45+r*20,65+i*15,100+r*10,255))
        im.save(path)
    def test_six_slots_invariants_and_validator(self):
        with tempfile.TemporaryDirectory() as tmp:
            t=Path(tmp);before=sha(ROOT/'assets/characters/protagonist-walk9-base.png')
            base=wear.rgba(wear.BASE);hero=wear.rgba(wear.HERO)
            for slot in PARTS:
                with self.subTest(slot=slot):
                    save(slot,t/'profiles');src=t/f'{slot}.png';self.fixture(slot,src);out=t/slot
                    item=next(k for k,v in wear.gear_items().items() if v==slot)
                    build(src,out,slot,'fixture-'+slot,[item],t/'profiles')
                    ov=wear.rgba(out/'overlay.png');clean=wear.rgba(out/'cleaned.png') if (out/'cleaned.png').exists() else None
                    clear=wear.clear_from_cleaned(base,clean) if clean is not None else None
                    errors,_=wear.check_look('fixture',slot,[item],ov,clear,hero)
                    self.assertEqual(errors,[])
                    labels=calibration(slot);preview=np.array(Image.open(out/'preview.png'))
                    self.assertTrue(np.array_equal(preview[labels==0],base[labels==0]))
                    prot=np.array(Image.open(ROOT/'gear/templates/protected.png').convert('L'))>127
                    self.assertFalse((ov[:,:,3][prot]>0).any())
                    for r in range(4):
                        for c in range(9):
                            lab=labels[r*256:(r+1)*256,c*256:(c+1)*256];p=preview[r*256:(r+1)*256,c*256:(c+1)*256]
                            for i in range(len(PARTS[slot])):
                                solid=(lab==i+1)&(base[r*256:(r+1)*256,c*256:(c+1)*256,3]>=128)
                                self.assertTrue((p[solid,:3]==(45+r*20,65+i*15,100+r*10)).all())
                    first=sha(out/'overlay.png');build(src,out,slot,'fixture-'+slot,[item],t/'profiles');self.assertEqual(first,sha(out/'overlay.png'))
            self.assertEqual(before,sha(ROOT/'assets/characters/protagonist-walk9-base.png'))
    def test_refuses_bad_sources_and_profile_drift(self):
        with tempfile.TemporaryDirectory() as tmp:
            t=Path(tmp);src=t/'source.png';save('helmet',t/'profiles');self.fixture('helmet',src)
            meta=t/'profiles/helmet.json';m=json.loads(meta.read_text());m['base_sha256']='wrong';meta.write_text(json.dumps(m))
            with self.assertRaisesRegex(ValueError,'hash drift'):build(src,t/'out','helmet','fixture',['neonVisor'],t/'profiles')
            Image.new('RGBA',(512,512),'white').save(src)
            with self.assertRaisesRegex(ValueError,'Opaque'):build(src,t/'out','helmet','fixture',['neonVisor'])
            Image.new('RGBA',(512,512)).save(src)
            with self.assertRaisesRegex(ValueError,'Empty'):build(src,t/'out','helmet','fixture',['neonVisor'])
    def test_prepare_does_not_accept_validator_refusal_with_zero_exit(self):
        from unittest.mock import patch
        from types import SimpleNamespace
        import prepare_gear
        with tempfile.TemporaryDirectory() as tmp:
            t=Path(tmp);src=t/'source.png';self.fixture('helmet',src)
            args=['prepare_gear.py','--atlas',str(src),'--slot','helmet','--look','fixture','--items','neonVisor','--out',str(t/'out')]
            with patch.object(sys,'argv',args),patch.object(prepare_gear,'build'),patch.object(prepare_gear.subprocess,'run',return_value=SimpleNamespace(returncode=0,stdout='NOT ADDED: invalid item',stderr='')):
                with self.assertRaisesRegex(SystemExit,'Validation failed'):prepare_gear.main()
if __name__=='__main__':unittest.main()
