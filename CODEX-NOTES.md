# Notes for Claude from Codex

Codex maintains this handoff file. Claude owns code and non-graphical changes; Codex owns sprite and art corrections. These are review findings and implementation proposals, not changes already made.

## Owner request: cyberpunk belt visible when equipped (November 24, 2026)

Owner: "add a note for claude to implement this as the belt item when equiped as gear".

**Requested implementation, not completed:** show the approved gunmetal/cyan cyberpunk belt on the protagonist when a belt is equipped through Gear. Codex supplies artwork; Claude implements game behavior. This handoff adds notes and offline art/tool sources only; it does not wire artwork into the live game.

### Gear mapping and behavior

- Read the equipped belt from `state.gear.belt` after `ensureGear`, not merely ownership in `state.relics`. Acquiring an item while another belt is worn must not replace the worn appearance.
- Current belt IDs at baseline `4e75f32f83472caaff587e539d7b57431d9df270` (Round 549): `scarabBelt`, `stormglassBelt`, `hourglassBelt`. No new gear ID, rewards, balance, stats, ownership or progression changes are requested.
- The owner has not selected a single one of those three IDs for this design. Proposed initial mapping: one shared cyberpunk visual for equipped belt-slot items, via an explicit item-ID-to-visual registry so distinct designs can be added later. Treat that mapping as a proposal, not a previously approved specific item assignment.
- Equip/swap/unequip must immediately refresh the hero's appearance. Unequip restores the original base appearance. Apply on automatic equip, save restoration/import, region changes and world rerender as well. Keep the existing mid-fight equipment restriction.
- Never redraw/re-generate the character on equip. Preserve his identity, poses, scale, position and movement timing; the Aetherlink stays on his anatomical LEFT arm and remains independent of belt/glove visuals.

### Artwork and tool status — release gate

The owner approved the cyberpunk belt look and four angle fitting drafts. **Those drafts are full-character previews, not calibrated overlay sheets.** Red/colored fringes remain on some drafts; the clean right-facing retry has an opaque background.

Codex created **Aethercede-Belt-Template-Kit.zip**, containing the standalone `Aethercede-Belt-Fitter.html`, editable source, README and offline logic checks:
https://chatgpt.com/library?file_id=libfile_58f582d4a3d881918ca2ed1ae3e6cb50&account_id=bb3643bb-6c30-409d-871d-6ef2035b06ec

This is an owner-access download, not a public runtime asset URL. The kit and all four belt fitting drafts plus the concept are checked into `tools/art-refresh/wearable-belt/` by this handoff. Start with that folder's README and included ZIP; Claude does not need Library access. Never ship a Library URL in the game.

The workbench preserves the original hero sheet and supports 36 fits, per-view artwork, x/y/width/height/rotation, brush-painted foreground masks, four walk previews, portable JSON projects, transparent belt-only PNG export and equipped-hero PNG export. **Initial anchors are estimates. Side/back concept crops are placeholders; fitting, real directional artwork and in-motion visual calibration remain unfinished.** JavaScript syntax and simulated-canvas logic checks passed. Browser visual/download verification was blocked by a local connection failure; production suitability is not established.

Codex should finalize the overlay art. Claude can prepare a registry/compositor with a safe base-art fallback, but do not release provisional art as finished. Keep generated character drafts as references only, not replacement animation sheets.

### Integration contract

- Base: `assets/characters/protagonist-walk9.png`, 2304 × 1024 RGBA; four rows front/down, left, right, back/up; nine 256 × 256 cells per row; column 0 idle, columns 1–8 walking. Recheck against latest main before integrating.
- Overlay must have identical dimensions and per-cell registration, transparent everywhere except visible belt pixels, with foreground arm/pouch occlusion removed from overlay alpha. Do not independently crop/recenter hero or overlay frames.
- Draw the base first and belt overlay second, with foreground protection baked into overlay alpha. The old brown belt/pouch is baked into the base; the replacement must cover the old belt, or Codex must provide a cleaned base. A transparent cutout does not remove old clothing.
- Prefer composing once per equipment change into a cached sheet, then keep the current animation renderer and shared frame index/direction. Cache by equipped visual IDs and art version; bound the cache. Handle async outfit races and failed artwork loads without a blank hero or stale outfit.
- Front buckle remains at anatomical front; back view shows rear strap. Do not mirror asymmetric character frames to synthesize the other direction. No added scale/bob animations.
- Add finished assets under a clearly named wearable-art directory and bump the appropriate art cache version. Inventory icons remain separate from animated wearable sheets.

### Acceptance checks for Claude

1. Equip each supported owned belt, swap, unequip, acquire with empty/occupied slot, save/reload/import and change region: appearance matches equipped state; no stats/reward changes.
2. All four directions: idle plus eight walking frames retain original frame coordinates, baseline and timing. No belt sliding, visible duplicate belt, fringe, clipped pouch or belt painted over foreground hands.
3. Equip other slots without losing the belt or moving the left-arm Aetherlink. Missing/unloaded art falls back cleanly; rapid changes never apply a stale outfit.
4. Inspect at actual game scale on desktop and mobile. Use the same composition for any Gear preview.
5. Run meaningful gear/save/hero-rendering checks appropriate to the implementation, then follow the repo's normal release workflow only after final art has passed visual review.

## Latest review: first two generated worlds

Reviewed November 23, 2026 against main `99f5712e332b9760f40dfa7fbc81f457e4714e2d` (Round 538). Read CHATGPT-NOTES.md and the current owner constraints in CLAUDE.md first. Fetch main before treating anything here as still open.

Scope: Neon Aftermath (`city`) and Solaris (internal region `elaris`, theme `solaris`). The room graphs, progression, names and bosses remain authored; the interiors are generated. This review does not propose changing that topology.

### Keep what works

- Sprite buildings keep their aspect ratio and allowed uniform scale. Do not revive generated buildings or the disabled mall to solve packing.
- Keep the chosen edges, straight-road rules, one edge per seam, no added shadows, no city grass parks, and Solaris's separate sandstone roads, river banks, bridges and oases.
- The Round 535 theme-scoped cache fix and Round 536 minimap window/redraw fix are improvements, not open bugs in this baseline.
- Six seeds across both worlds had no overlapping final lot rectangles, no failed checked door landings and no unwalkable hubs.
- The existing city-buildings suite passed for both worlds, including undistorted fitting, immediate-neighbor diversity and its district fallback budget.
- Fresh live God Mode inspection showed the city and Solaris drawing their distinct themes; Solaris waypoint travel remained responsive. That preview was not a normal progression or mobile playthrough.

## Recommended order

| Order | Change to investigate | Why |
|---|---|---|
| 1 | Score the final scene, after sprite fitting and decoration | The current density score is recorded before later footprint changes. It cannot tell whether final space is purposeful. |
| 2 | Reuse walkability, clearance and reachability results during placement | The sampled CPU profile spends far more self-time here than in rectangle extraction. |
| 3 | Reserve semantic gameplay space before filling decorative lots | Reduce repeated object relocation and make plazas, entrances and approaches look intentional. |
| 4 | Penalize repeated building art across the visible scene | The 40px neighbor rule allows conspicuous repeats only 150–200px apart. |
| 5 | Bind landmarks and local compositions to room roles | A fixed room name or boss purpose should influence which art and approach space its generated interior receives. |
| 6 | Stabilize random choices and version the result | Use seeded shuffles and separate random streams per stage so an art-list change does not unnecessarily reshuffle the world. |

Ship these separately, with seed comparisons. Do not replace the whole generator at once.

## Evidence: six-seed scan

Seeds: **1, 2, 9, 21, 77, 4242**. Each scan configured the world, queried its global plan, final lots, all room hubs and cardinal door landings, then POI/chest/merchant placement.

630 room plans/hubs were checked across the 12 world/seed cases. No failed checked doors/hubs or overlapping final lot rectangles were found. This is a finite sample, not a proof for every seed or every decoration pixel.

“Buildings” below means a roof lot whose sprite slot starts with building-, excluding ruin pictures. That distinction matters: counting ruin slots as foreign building districts gives a misleading fallback rate.

| World | Seed | Buildings | Distinct building images | Cross-district building choices | Landmarks |
|---|---:|---:|---:|---:|---:|
| Neon Aftermath | 1 | 204 | 31 | 2 | 9 |
| Neon Aftermath | 2 | 229 | 30 | 8 | 7 |
| Neon Aftermath | 9 | 209 | 30 | 1 | 11 |
| Neon Aftermath | 21 | 203 | 30 | 3 | 10 |
| Neon Aftermath | 77 | 229 | 30 | 4 | 11 |
| Neon Aftermath | 4242 | 210 | 28 | 2 | 11 |
| Solaris | 1 | 207 | 23 | 2 | 7 |
| Solaris | 2 | 219 | 23 | 2 | 5 |
| Solaris | 9 | 182 | 23 | 0 | 7 |
| Solaris | 21 | 206 | 23 | 5 | 9 |
| Solaris | 77 | 166 | 23 | 1 | 6 |
| Solaris | 4242 | 224 | 23 | 2 | 5 |

Actual cross-district building fallback is 0–3.5% here: this is working reasonably well. Prefer improving within-district variety and appropriate footprints over weakening district identity.

## 1. Replace the early density score with final, classified coverage

**Source-confirmed measurement gap:** assets/chrono-gen.js records genWorldScore during rectangular lot filling, before plaza cutting, landmark merging and sprite-world fitting/shrinking create the final lots.

Across the scan, the early mean bare-ground score is about 1.0–2.0% of room cells. A separate coverage calculation on final lots finds about **14.5–16.6% of active-room cells** that were originally buildable ground but are not inside any final lot rectangle. That is about 21.9–25.4% of the original buildable cells.

**Do not call all of that wasted ground.** It includes intended plaza cuts, approaches, small residual strips and other open paving. The two calculations are different measures. The result demonstrates that the early score does not classify the final scene; it does not demonstrate that density should simply increase.

Proposed final categories:
- building/ruin/landmark footprint;
- intended yard, oasis, walkable park picture or courtyard;
- street/sidewalk/bridge;
- reserved interaction and doorway approach;
- deliberately open plaza;
- unassigned residual space.

Measure largest unassigned patch and its shape as well as area. Merge useful residual strips into a deliberate courtyard/yard or leave readable paving. Do not squeeze/stretch sprites or scatter filler into every gap.

**Acceptance:** final scoring runs after every geometry-changing pass; intentional open space is accounted for; before/after plans keep all existing door, collision, art-scale and edge invariants. Approve the visual effect on the same seeds.

## 2. Optimize measured navigation/placement work first

One Node/V8 CPU profile ran newGame(), then configured seed 4242 in city and Solaris and queried each room's plans, patrols, POIs and chest. Total profile duration was about 13.2 seconds; it includes initialization and fixture overhead. It is not a renderer/GPU benchmark or a mobile timing claim.

Approximate **self-sample shares**, not inclusive call-tree totals:
- cityRoomWalk: 19.1%;
- cityRoomMask: 9.0%;
- walkable: 8.0%;
- cityEnemyOk: 6.3%;
- organicPockets: 4.4%;
- genWorld: 1.3%;
- bigRect: 0.5%.

This suggests a better first target than rewriting largest-rectangle extraction.

Candidates:
1. Rasterize blocker rectangles/circles into each room mask by affected ranges, rather than testing every mask cell against every blocker.
2. Cache connected-component labels as integer grid arrays. organicPockets currently builds string coordinate sets and repeatedly splits coordinates during flood fill.
3. Precompute valid item candidates by footprint class, including distance from roads, obstacles and room edges. Search the nearest valid candidate instead of rescanning an 8px grid through many fallback tiers.
4. Precompute a clearance map for enemy footprints so patrol candidate checks can reuse it.
5. Scope all such data by world/theme, seed and generation version and evict superseded seeds.

Some caching already exists. Extend it only where a profile shows work remains; do not assume a cache name means a value is missing.

**Acceptance:** compare masks bit-for-bit and interaction positions/invariants on the seed corpus before measuring speed; avoid optimizing by dropping constraints. Use separate cold/warm measurements and later check real phones.

## 3. Reserve gameplay anchors before decorative packing

**Source observation:** the current generator selects streets and lots, cuts candidate squares, fits sprites and later relocates actual objects through cityFixSpot. This repair system is useful but can work against the scene it is trying to preserve.

Give each required object a reserved graphic footprint, interaction position and approach before nearby buildings and yard props are finalized. Resolve multiple anchors together so independently chosen items do not compete for the same attractive space. Expand or choose a different neighboring lot within existing road rules when an anchor cannot fit.

Keep the strong “never overlap a sprite” rule. Report a failed reservation rather than silently treating an emergency fallback as a clean placement.

Seed-specific evidence from the current diagnostics: city seed 1, room 4,5 nexus; Solaris seed 1, room 6,4 merchant; city seed 21, room 3,8 event and room 4,5 nexus required an edge-gap-relaxed search in this scan. The log records a relaxed search tier, not proof the final point violates every named rule. Other callers can populate additional entries; compare only after a defined scan.

**Acceptance:** every required interaction has a path from an arrival/door, sufficient graphic clearance and an intentional approach; normal seeds need fewer degraded searches, and an impossible placement is recorded with a stable object id.

## 4. Improve diversity over the visible neighborhood

**Measured opportunity, not a claim the 40px rule is broken:** sprite fitting favors high-fill choices; a short immediate-neighbor exclusion does not prevent the same distinctive facade recurring in the same screen.

Examples of final lot-center distances:
- **city, seed 2, room 6,6:** two bathhouse sprites about 150px apart. Lot rectangles in world coordinates: [5375,1325,5475,1500] and [5525,1325,5625,1500]. Their 50px gap passes the existing 40px neighbor exclusion.
- **Solaris, seed 4242, room 7,2:** two crystal-stall sprites about 175px apart. Lots: [5800,1325,5925,1525] and [5975,1325,6100,1525].

Suggested scoring for an already-valid candidate: fit quality + district affinity + recent/local-use penalty + silhouette variety. Evaluate repeats across a room-width neighborhood, with a stronger penalty for large distinctive landmarks than for generic homes or intentional market stall rows. Preserve a valid fallback where available art cannot meet every diversity preference.

Do not automatically mirror directional buildings, rotate facades or introduce recolors/shadows to fake variety. If one footprint class dominates choices, Codex can supply additional compatible art.

**Acceptance:** reduce accidental same-facade clustering on the same seed set without increasing district fallback, distorting art or making a room less navigable. Explicit market repetition may remain.

## 5. Match generated compositions to authored room purpose

Landmark counts vary from 7–11 in the city and 5–9 in Solaris in this sample. Those counts are not an error: the placement cap is not a promise of twelve monuments in every seed.

Improve where memorable anchors appear:
- markets: reserve a coherent stall court with a clear route through it;
- refuges/waypoints: emphasize a readable arrival space without unintended encounter interference;
- temple/boss approaches: select fitting monument silhouettes and preserve an approach;
- docks: coherent cargo frontage and shore access;
- Solaris rivers: choose bridge approaches and nearby settlement composition together;
- oases: use them as deliberate visual/rest landmarks while preserving pool and palm clearances.

Use room-role tags and weighted local templates, then fill remaining lots with existing art. Prefer a few meaningful compositions over making every room equally elaborate. Keep named room connectivity and current progression unchanged unless separately requested.

**Acceptance:** review the room name, role and generated composition together, including viewed from each approach. Tie “memorable landmark coverage” to route segments, not only a global count.

## 6. Make seeded outcomes easier to preserve

**Source-level portability risk, not a reproduced current browser mismatch:** the generator uses random comparators such as sort(() => rnd() - 0.5) for some orders. Such a comparator is inconsistent; sort algorithms/engine versions can consume random calls differently.

Use an explicit seeded shuffle for random ordering. Separate random streams for roads, lots, landmarks, sprite choice and clutter, keyed by stable world/stage/object identities. Adding one building image or changing a decoration pass should not unnecessarily alter streets and progression anchors.

Version any generation change affecting saved geometry. These changes can intentionally change old seed outputs, so preserve or migrate established saves rather than silently claiming the seed alone preserves a world forever.

**Acceptance:** repeatable scene signatures in fresh runs, after region round trips/import, and across supported engines. Document the generation version in diagnostic records.

## Architectural direction before adding more worlds

Keep one pipeline with explicit outputs:
1. authored graph and semantic anchors;
2. terrain, water and road/bridge constraints;
3. anchor reservations and circulation;
4. art-aware lot packing;
5. decoration;
6. final collision/reachability and quality validation;
7. rendering and bounded caches.

This is an incremental direction, not a request to discard the current generator. Future forests/islands/coasts should share contracts and tests while retaining their own circulation and silhouettes.

## Validation and limits

- Latest main was fetched before review; baseline is Round 538 above.
- Six-seed real-script scan and the existing city-buildings.test.cjs were run.
- The scan found no overlapping final lot rectangles and no failed checked hubs/doors in either world.
- One CPU profile supports prioritization only; it does not quantify a promised speedup.
- Live visual inspection used God Mode with a fresh, unrecorded numeric seed. No seed-specific defect is asserted from those screenshots.
- A native-canvas offline painting attempt did not reproduce the browser's full artwork correctly; it was discarded as a review aid, not treated as a game bug. Visual observations came from the live browser.
- No full campaign, mobile-device pass or exhaustive seed proof was performed in this focused algorithm review.
- No generator or art changes were implemented in this handoff.

## Next small implementation for Claude to consider

Start with final-scene coverage diagnostics and reusable placement candidate/clearance data. Compare seeds 1/2/9/21/77/4242 before touching visual policy. Then tune neighborhood diversity and role-aware anchors with side-by-side previews. Keep approved edges, road geometry and all art proportions intact.
