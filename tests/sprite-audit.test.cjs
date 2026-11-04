'use strict';
// Round 352: every creature sheet passes tools/sprite_audit.py (no stray fragments, clipped edges, keying fringe or pale matte).
const { spawnSync } = require('child_process'), path = require('path');
const r = spawnSync('python3', ['-I', path.join(__dirname, '..', 'tools', 'sprite_audit.py')], { encoding: 'utf8' });
if (r.error) { console.log('sprite-audit skipped: python3 not available'); process.exit(0); }
if (r.status !== 0) { console.error(r.stdout + r.stderr); process.exit(1); }
console.log('sprite-audit ok');
