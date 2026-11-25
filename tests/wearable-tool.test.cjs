'use strict';
// Round 559: tools/wearable_add.py's rules (Codex's review): each case below is a real look with one fault added, so the rule
// under test is the one that has to catch it; and --check never writes.
const { spawnSync } = require('node:child_process'), path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const ROOT = path.join(__dirname, '..');
const py = `
import sys, json, numpy as np
sys.path.insert(0, 'tools'); import wearable_add as w
base = w.rgba(w.BASE); boots = w.rgba('assets/characters/wearable/cyber-boots/overlay.png')
def probs(o, items=['boots'], slot='boots'): return w.check_look('t', slot, items, o, None, base)[0]
out = {'clean': probs(boots)}
f = boots.copy(); f[5:20, 5:20] = [255, 255, 255, 1]; out['far_alpha1'] = probs(f)                      # a faint fragment far from the hero
f = boots.copy(); f[..., 3] = np.maximum(f[..., 3], 30); out['faint_sheet'] = probs(f)                  # a faint matte over the whole sheet
f = boots.copy(); f[1 * 256:2 * 256, 3 * 256:4 * 256] = 0; out['empty_frame'] = probs(f)                  # one frame missing the item
f = boots.copy(); ys, xs = np.nonzero(f[..., 3] > 200); f[ys[:60], xs[:60]] = [0, 255, 0, 255]; out['key_green'] = probs(f)
out['no_items'] = probs(boots, []); out['repeated'] = probs(boots, ['boots', 'boots']); out['wrong_slot'] = probs(boots, ['scarabBelt'])
print(json.dumps(out))`;
const r = spawnSync('python3', ['-c', py], { cwd: ROOT, encoding: 'utf8' });
assert.equal(r.status, 0, r.stderr);
const o = JSON.parse(r.stdout.trim().split('\n').pop());
assert.deepEqual(o.clean, [], 'the real boots pass');
assert(o.far_alpha1.some(p => /outside the hero/.test(p)), 'any alpha far outside the hero is caught');
assert(o.faint_sheet.some(p => /outside the hero/.test(p)), 'a faint matte over the sheet is caught');
assert(o.empty_frame.some(p => /under 40 solid/.test(p) && /1,3/.test(p)), 'an empty frame is caught, by its cell');
assert(o.key_green.some(p => /green or magenta/.test(p)), 'background colour left in the art is caught');
assert(o.no_items.some(p => /no item ids/.test(p)) && o.repeated.some(p => /repeated/.test(p)) && o.wrong_slot.some(p => /not a boots/.test(p)), 'item ids checked');
// --check is read-only
const reg = path.join(ROOT, 'assets/hero-wear-looks.js'), before = fs.readFileSync(reg, 'utf8');
try { fs.writeFileSync(reg, before + '// stale\n'); const c = spawnSync('python3', ['tools/wearable_add.py', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(c.status, 1, 'a stale registry fails the check'); assert.equal(fs.readFileSync(reg, 'utf8'), before + '// stale\n', 'and --check leaves it as it was');
} finally { fs.writeFileSync(reg, before); }
// (Round 562) --from reads a hand-off folder's manifest.json; --review writes the review sheet and walk animations
{ const os = require('node:os'), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wear-')), out = fs.mkdtempSync(path.join(os.tmpdir(), 'rev-'));
  fs.copyFileSync(path.join(ROOT, 'assets/characters/wearable/cyber-gloves/overlay.png'), path.join(dir, 'overlay.png'));
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ look: 'cyber-gloves', slot: 'gloves', items: ['ember', 'thornhideGloves', 'tempestGloves'], cleaned: false }));
  let c = spawnSync('python3', ['tools/wearable_add.py', '--from', dir, '--dry-run', '--review', out], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(c.status, 0, c.stdout + c.stderr); assert(fs.existsSync(path.join(out, 'cyber-gloves-review.png')) && fs.existsSync(path.join(out, 'cyber-gloves-walk-right.gif')), 'review sheet and walks written');
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ look: 'cyber-gloves', slot: 'gloves', items: 'ember', cleaned: false }));
  c = spawnSync('python3', ['tools/wearable_add.py', '--from', dir, '--dry-run'], { cwd: ROOT, encoding: 'utf8' }); assert.notEqual(c.status, 0, 'items must be a list');
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ look: 'cyber-gloves', slot: 'gloves', items: ['ember'], cleaned: true }));
  c = spawnSync('python3', ['tools/wearable_add.py', '--from', dir, '--dry-run'], { cwd: ROOT, encoding: 'utf8' }); assert.notEqual(c.status, 0, 'a manifest promising cleaned.png that is not there is refused');
  fs.rmSync(dir, { recursive: true }); fs.rmSync(out, { recursive: true }); }
console.log('wearable-tool ok');
