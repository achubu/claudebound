// Round 184: automated playtest in a real browser (Playwright). Not part of the shipped suite.
//   python3 -m http.server 8123 &   then   node tests/playtest-walk.cjs [world]
// For every world it walks the hero with the game's own tap-to-move routes (setTouchDestination +
// move(), exactly what a tap does) through every door, from every spot where the hero actually
// arrives in a room, and tap-routes from each arrival to every item in the room. It reports:
//   - doors with no route, routes that stall or never cross, and arrivals off the path;
//   - items the hero cannot walk up to (chests, gear, points of interest, merchant, Cardsmith,
//     Nexus Waypoints), items stacked on each other or on a patrol, the portal covering an item,
//     and items under the HUD panel or the minimap on a 1280x800 screen;
//   - any page error while walking, and while opening every menu in every world.
// Writes tests/playtest-walk.json. The player's save in the browser profile is not touched
// (it runs in a fresh profile).
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const only = process.argv[2];
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  page.setDefaultTimeout(0);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:8123/index.html'); await page.waitForTimeout(1000);
  await page.click('#newBtn'); await page.waitForTimeout(300);
  // Measure where the HUD and minimap cover the world on this screen, in room pixels.
  const covers = await page.evaluate(() => {
    const w = document.getElementById('world').getBoundingClientRect(), sx = w.width / 800, sy = w.height / 500;
    const box = id => { const el = document.getElementById(id); if (!el) return null; const r = el.getBoundingClientRect(); return { x0: (r.left - w.left) / sx, y0: (r.top - w.top) / sy, x1: (r.right - w.left) / sx, y1: (r.bottom - w.top) / sy }; };
    return { hud: box('hud'), minimap: box('minimap') };
  });
  const worlds = only ? [only] : await page.evaluate(() => WORLD_ORDER.slice());
  const report = {};
  for (const world of worlds) {
    const r = await page.evaluate(({ world, covers }) => {
      function clear() { closeMenu(); for (const id of ['menuOverlay', 'startOverlay', 'battleOverlay']) document.getElementById(id).classList.add('hidden'); state.battle = null; }
      const interruptions = [];
      const out = { rooms: 0, fights: 0, crossings: 0, arrivals: 0, itemRoutes: 0, problems: [] };
      const P = (kind, room, what) => out.problems.push({ kind, room, what });
      // Quiet the screen while walking; restore afterwards.
      const quiet = {}; for (const f of ['renderWorld', 'toast', 'save']) { quiet[f] = window.eval(f); window.eval(f + '=function(){}'); }
      newGame(); state.region = world; configureRegion(world); state.relics = Object.keys(GEAR); ensureGear(); state.playerLevel = 60;
      state.bosses = Object.values(WORLD_BOSS_ROOMS).map(b => b[1]); // boss doors open, bosses gone
      clear();
      const start = regionStartRoom(world), dirs = ['n', 's', 'e', 'w'], seen = new Set(), queue = [[start, { x: 400, y: 300 }, 'start']];
      const door = { n: { x: 400, y: 15 }, s: { x: 400, y: 485 }, e: { x: 785, y: 250 }, w: { x: 15, y: 250 } };
      const exitTo = raw => typeof raw === 'string' ? raw : raw && raw.to;
      const walkTo = (target, exit, item = null) => { // pump the real move() like the game loop does at 30 fps
        const from = state.room; clear();
        if (!setTouchDestination(target, exit)) return { ok: false, why: 'no route' + (state.battle ? ' (in a fight)' : !document.getElementById('menuOverlay').classList.contains('hidden') ? ' (menu open: ' + document.getElementById('menuModal').textContent.slice(0, 40) + ')' : '') };
        for (let i = 0, fights = 0; i < 900; i++) {
          move(1 / 30);
          if (state.room !== from) return { ok: true, crossed: true };
          if (state.battle) { // walked into a patrol: win the fight, then tap the same spot again
            out.fights++; fights++; if (fights > 4) return { ok: false, why: 'fights keep starting' };
            const b = state.battle; b.enemy.hp = 0; try { winBattle(); finishBattle(); } catch (e) { P('fight error', state.room, e.message); }
            clear(); state.battle = null;
            if (!setTouchDestination(target, exit)) return { ok: false, why: 'no route after a fight' };
            continue;
          }
          if (!document.getElementById('menuOverlay').classList.contains('hidden')) { // walked past something that opened
            const near = [poiAt(state.room), merchantRoom()].filter(q => q && q.key === state.room).sort((a, b) => Math.hypot(a.x - state.pos.x, a.y - state.pos.y) - Math.hypot(b.x - state.pos.x, b.y - state.pos.y))[0];
            const what = near ? near.type : 'menu';
            if (item && (!near || Math.hypot(near.x - item.x, near.y - item.y) < 5)) return { ok: true, crossed: false, opened: true }; // the tapped item opened
            interruptions.push({ room: state.room, what, used: !!(near && typeof poiUsed === 'function' && near.id && poiUsed(near)) });
            if (++fights > 6) return { ok: false, why: 'keeps opening ' + what };
            clear(); if (!setTouchDestination(target, exit)) return { ok: false, why: 'no route after ' + what };
            continue;
          }
          if (!activeTouchRoute()) return { ok: true, crossed: false };
        }
        cancelTouchRoute(); return { ok: false, why: 'stalled' };
      };
      const items = key => {
        const list = [], c = chestFor(key), q = rooms[key].relic, p = typeof poiAt === 'function' && poiAt(key), m = merchantRoom(), cs = typeof cardsmithFor === 'function' && cardsmithFor();
        if (c && !state.chests.includes(c.id)) list.push(['chest', c, 38]);
        if (q) list.push(['relic ' + q[0], { x: q[3], y: q[4] }, 48]);
        if (p) list.push([p.type, p, 40]);
        if (m && m.key === key) list.push(['merchant', m, 40]);
        if (cs && cs.key === key) list.push(['cardsmith', cs, 40]);
        return list;
      };
      const inBox = (b, p, pad = 0) => b && p.x > b.x0 - pad && p.x < b.x1 + pad && p.y > b.y0 - pad && p.y < b.y1 + pad;
      const testedItems = new Set();
      while (queue.length) {
        const [key, pos, via] = queue.shift(), tag = key + '<' + via;
        if (seen.has(tag)) continue; seen.add(tag);
        if (![...seen].some(t => t.startsWith(key + '<') && t !== tag)) out.rooms++;
        out.arrivals++;
        clear(); state.room = key; state.pos = { ...pos }; state.visited = [key];
        if (!walkable(key, pos.x, pos.y)) P('arrival off path', key, 'via ' + via + ' at ' + Math.round(pos.x) + ',' + Math.round(pos.y));
        // Items: reachable from this arrival, and sensibly placed (checked once per room).
        for (const [kind, it, reach] of items(key)) {
          state.room = key; state.pos = { ...pos };
          const res = walkTo({ x: it.x, y: it.y }, null, it); out.itemRoutes++;
          const d = Math.hypot(state.pos.x - it.x, state.pos.y - it.y);
          if (!res.ok || (!res.opened && d > reach)) P('item out of reach', key, kind + ' from ' + via + ': ' + (res.ok ? 'ends ' + Math.round(d) + 'px away' : res.why));
          if (testedItems.has(key + kind)) continue; testedItems.add(key + kind);
          if (walkable(key, it.x, it.y)) P('item on the path', key, kind);
          for (const [k2, it2] of items(key)) if (k2 !== kind && Math.hypot(it.x - it2.x, it.y - it2.y) < 34) P('items overlap', key, kind + ' + ' + k2);
          for (const s of roomSpawns(key)) if (Math.hypot(it.x - s.x, it.y - s.y) < 60) P('item next to a patrol', key, kind + ' and ' + s.type + ' ' + Math.round(Math.hypot(it.x - s.x, it.y - s.y)) + 'px');
          if (portalTarget && (() => { const old = state.room; state.room = key; const t = portalTarget(); state.room = old; return t; })() && it.x > 330 && it.x < 470 && it.y > 300 && it.y < 480) P('portal covers item', key, kind);
          if (inBox(covers.hud, it, 10)) P('item under the HUD', key, kind + ' at ' + Math.round(it.x) + ',' + Math.round(it.y));
          if (inBox(covers.minimap, it, 10)) P('item under the minimap', key, kind + ' at ' + Math.round(it.x) + ',' + Math.round(it.y));
        }
        // Doors.
        for (const d of dirs) {
          const raw = rooms[key].exits[d]; if (!raw) continue;
          state.room = key; state.pos = { ...pos };
          const res = walkTo(door[d], { key, dir: d });
          if (!res.ok) { P('door unreachable', key, d + ' from ' + via + ': ' + res.why); continue; }
          if (!res.crossed) { P('route ends without crossing', key, d + ' from ' + via + ' (stopped at ' + Math.round(state.pos.x) + ',' + Math.round(state.pos.y) + ')'); continue; }
          out.crossings++;
          if (state.room !== exitTo(raw)) P('crossed into the wrong room', key, d + ' went to ' + state.room + ' not ' + exitTo(raw));
          queue.push([state.room, { ...state.pos }, key + d]);
        }
      }
      out.interruptions = {}; for (const it of interruptions) { const k = it.room + ' ' + it.what + (it.used ? ' (used)' : ''); out.interruptions[k] = (out.interruptions[k] || 0) + 1; }
      out.unvisited = Object.keys(rooms).filter(k => ![...seen].some(t => t.startsWith(k + '<')));
      for (const [f, v] of Object.entries(quiet)) { window.__q = v; window.eval(f + '=__q'); }
      return out;
    }, { world, covers });
    // Menus in this world.
    const menuErrors = await page.evaluate(world => {
      const bad = [];
      state.region = world; configureRegion(world); state.room = regionStartRoom(world); state.pos = { x: 400, y: 300 }; renderWorld();
      for (const f of ['showMap', 'showDeck', 'showCharacter', 'showGear', 'showDevice', 'showMainMenu']) { try { window[f] ? window[f]() : window.eval(f + '()'); closeMenu(); } catch (e) { bad.push(f + ': ' + e.message); } }
      return bad;
    }, world);
    r.menuErrors = menuErrors;
    report[world] = r;
    const byKind = {}; for (const p of r.problems) byKind[p.kind] = (byKind[p.kind] || 0) + 1;
    console.log(world, '| rooms', r.rooms, '| arrivals', r.arrivals, '| crossings', r.crossings, '| fights won', r.fights, '| item routes', r.itemRoutes, '| walk-past popups', Object.values(r.interruptions).reduce((a, b) => a + b, 0), '| unvisited', r.unvisited.length, '| problems', JSON.stringify(byKind), '| menu errors', menuErrors.length);
  }
  report.pageErrors = [...new Set(errors)];
  console.log('page errors:', report.pageErrors.length ? report.pageErrors.join(' | ') : 'none');
  require('fs').writeFileSync(require('path').join(__dirname, 'playtest-walk.json'), JSON.stringify(report, null, 1));
  await browser.close();
})();
