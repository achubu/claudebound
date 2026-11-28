#!/usr/bin/env python3
"""Meaningful source reconstruction and integrity checks; no runtime writes."""
import tempfile, unittest
from pathlib import Path
import numpy as np
from PIL import Image
import master
class AuthoringMasterTest(unittest.TestCase):
 def test_reconstruction_and_tamper_refusal(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp);m=master.build(p)
   self.assertTrue(np.array_equal(np.array(Image.open(master.w.HERO).convert('RGBA')),np.array(Image.open(p/'reconstructed.png'))))
   self.assertFalse(m['capabilities']['bald']);self.assertFalse(m['capabilities']['barefoot'])
   q=p/m['planes']['body']['file'];q.write_bytes(q.read_bytes()+b'tamper')
   with self.assertRaisesRegex(ValueError,'Plane changed'):master.assemble(p,p/'bad.png')
 def test_duplicate_slot_refusal(self):
  with tempfile.TemporaryDirectory() as tmp:
   with self.assertRaisesRegex(ValueError,'Duplicate slot'):master.equip(['cyber-boots','cyber-boots'],Path(tmp)/'bad.png')
if __name__=='__main__':unittest.main()
