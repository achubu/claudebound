"""Package generated card illustrations without changing their composition.

Usage: python tools/art-refresh/package.py /path/to/generated-manifest.json
The manifest contains an array of {path, source} records. Originals remain
untouched; shipped artwork is optimized to square 512px WebP images.
"""
import json
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
records = json.loads(Path(sys.argv[1]).read_text())
for record in records:
    target = ROOT / record['path']
    with Image.open(record['source']) as source:
        if source.width != source.height:
            raise ValueError(f"Expected square artwork: {record['source']}")
        source.convert('RGB').resize((512, 512), Image.Resampling.LANCZOS).save(
            target, 'WEBP', quality=88, method=6)
    # Static is a non-upgradeable junk card. Keep all resolver paths valid
    # for imported saves without implying different gameplay tiers.
    if record['id'] == 'static':
        for level in (1, 2, 3):
            (ROOT / f'assets/cards/level{level}/static.webp').write_bytes(target.read_bytes())
