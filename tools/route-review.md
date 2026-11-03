# Route review: automatic bridges in Neon Aftermath (owner note, Round 339)

**To do:** recheck every route for the problem found in room 1,6. There, `axis_bridges()` in
`tools/build_room_masks.py` joined a walkable courtyard to the street by cutting a straight corridor through a
painted building. The terminal's footpath then reached it "through" the factory. Round 339 fixed 1,6 by hand
(`BRIDGE_CUTS` and `STREET_LINKS`).

How to check a room: `python3 tools/nook_view.py <room> <x0,y0,x1,y1> out.png` draws the room painting with the final walk mask and
nook paths on top (see Round 339 in CHANGES.md), then look at each bridge below. A bridge is fine when it crosses a
crosswalk, a plaza, a garden path or a gap in a painted road. It is a bug when it runs over a roof, a wall, water or
props. Fix with `BRIDGE_CUTS` (remove it) and, if the area it served is still needed, `STREET_LINKS` (a corridor over
open ground). Then re-run `python3 tools/build_room_masks.py` and check that only the intended rooms change.

Bridges of 300 px or more still in the mask after the Round 339 fix (room px, x0,y0 to x1,y1):

| Room | Size | Box | Checked |
|---|---|---|---|
| 0,7 | 501 | (221,109)-(264,122) | |
| 0,7 | 1462 | (603,143)-(646,176) | |
| 0,7 | 3252 | (249,167)-(329,210) | |
| 0,7 | 3000 | (492,453)-(560,496) | |
| 1,6 | 710 | (83,184)-(126,201) | |
| 2,7 | 2470 | (177,91)-(220,149) | |
| 2,7 | 3301 | (253,161)-(334,204) | |
| 2,7 | 2972 | (493,453)-(560,496) | |
| 2,8 | 2840 | (649,320)-(692,384) | |
| 3,7 | 2491 | (475,183)-(534,226) | |
| 3,7 | 895 | (468,295)-(489,338) | |
| 3,7 | 416 | (63,378)-(106,387) | |
| 3,7 | 3451 | (261,431)-(339,474) | |
| 4,7 | 867 | (323,72)-(366,91) | |
| 4,7 | 2096 | (224,225)-(271,268) | |
| 4,7 | 1280 | (637,407)-(680,436) | |
| 4,8 | 972 | (133,118)-(176,140) | |
| 4,8 | 847 | (125,298)-(168,319) | |
| 4,8 | 2115 | (649,307)-(692,355) | |
| 4,8 | 388 | (159,371)-(168,414) | |
| 4,9 | 353 | (25,288)-(68,296) | |
| 4,9 | 1283 | (369,350)-(412,379) | |
| 5,7 | 491 | (569,326)-(612,339) | |
| 5,8 | 3314 | (567,303)-(610,378) | |
| 5,8 | 1922 | (179,316)-(222,359) | |
| 6,7 | 999 | (587,22)-(630,49) | |
| 6,7 | 356 | (715,47)-(758,55) | |
| 6,7 | 2076 | (757,128)-(799,176) | |
| 6,7 | 419 | (687,233)-(696,276) | |
| 7,4 | 1657 | (452,115)-(489,158) | |
| 7,4 | 1081 | (363,180)-(406,209) | |
| 7,5 | 507 | (371,93)-(414,109) | |
| 7,5 | 371 | (383,431)-(420,443) | |
| 8,7 | 525 | (295,57)-(338,72) | |
| 8,7 | 603 | (454,59)-(488,104) | |
| 8,7 | 351 | (457,235)-(464,278) | |
| 8,9 | 2101 | (483,334)-(526,391) | |
| 8,9 | 831 | (243,343)-(286,361) | |

Also check every nook footpath (`NOOKS`) for the same problem: a footpath is drawn straight from the nearest street
point, so it can cross a prop or wall when the nearest street is on the far side of one. The tile worlds (Solaris,
Sky Isles, Elaris, Vespera, Chronospire) place items on plazas from `tools/plazas.py` and are not affected by
`axis_bridges`, but their item pads should get the same visual pass.
