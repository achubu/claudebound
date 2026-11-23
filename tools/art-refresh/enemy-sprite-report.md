# Enemy sprites: what needs new art (Round 534)

Every enemy in the game (56, all six worlds) was checked: each uses a 4-frame walk sheet; only the **Sunwrapped Revenant** also
has battle poses (attack and hurt). The sprite audit (`tools/sprite_audit.py`) finds no broken sheets (no clipped edges, stray
pixels or keying fringe), so this list is about **reused art, weak animation and missing poses**.

## What a sheet must be (so it drops straight in)

- One PNG, **4 frames in one row** (or 8 frames in a row, or a 2x2 grid; all are cut by the tools), each frame the same size,
  on a **flat pure green (#00FF00)** background, no shadow, no ground, nothing touching a frame's edge.
- The creature **faces right**, side-on 3/4 view, the same scale in every frame, feet on the same line.
- A walk cycle: 4 clearly different poses (legs, wings or body visibly move), looping back to frame 1.
- Optional battle poses, one image each on green: **attack** (mid-strike) and **hurt** (recoiling).
- Style: detailed 2D game art matching the current sheets (crisp outlines, painterly shading).

## 1. Bosses using another enemy's art (highest priority)

| World | Enemy | Uses now | Wanted |
|---|---|---|---|
| Solaris | **The Sun Pharaoh** (world boss) | the forest Bloom Tyrant (a dark flowering stag) | a desert god-king: a towering pharaoh or sphinx-headed colossus in gold and lapis, sun disc, staff |
| Elaris | **The Tidebound Warden** (mini-boss) | the Drowned Heron, unchanged | a lake guardian: armoured water spirit or kelp-clad turtle knight |
| Elaris | **The Gale Sovereign** (mini-boss) | the Storm Moth, unchanged | a storm lord of the forest: a crowned wind-wyvern or great owl of storms |
| Vespera | **The Resonant Phantom** (mini-boss) | the city's old Phase Shade | a storm-coast spectre: a tall phantom of sound and lightning, tuning-fork staff, resonating rings |

## 2. Recolours of another world's creature (look the same as an earlier enemy)

| World | Enemy | Recolour of | Wanted |
|---|---|---|---|
| Vespera | **The Tempest Colossus** (world boss) | the Bloom Tyrant stag | a storm titan: a lightning-wreathed stone giant or thunder whale-beast |
| Chronospire | **The Chronarch** (final boss) | the Bloom Tyrant stag, in gold | a clockwork god: a many-armed brass being with a clock-face halo and hourglass core |
| Vespera | Static Fox | Cinder Fox (Elaris) | an electric fox with a lightning-rod tail |
| Vespera | Tempest Moth | Storm Moth (Elaris) | a storm-cloud moth |
| Vespera | Brinewing Heron | Drowned Heron (Elaris) | a salt-crusted sea bird, a pelican or cormorant |
| Vespera | Rimeglass Stag | Blight Antler (Elaris) | a frost-glass elk |
| Vespera | Thunder Mauler | Reactor Mauler (city) | a storm-armoured brute |
| Chronospire | Gearhound | Cinder Fox (Elaris) | a clockwork hound with exposed gears |
| Chronospire | Tick Moth | Storm Moth (Elaris) | a brass clockwork moth |
| Chronospire | Hourglass Heron | Drowned Heron (Elaris) | a brass-and-glass heron with an hourglass body |
| Chronospire | Pendulum Stag | Blight Antler (Elaris) | a stag with a swinging pendulum, gears in its antlers |

## 3. Walk cycles that barely move (the 4 frames are nearly the same)

- Neon Aftermath: **Reactor Mauler**, Crown Observer, Tunnel Borehound
- Solaris: **Solar Scarab**, **Dune Scorpion**, **Mirage Ibis**, The Noon Toller
- Sky Isles: **Rain Drone**, **The Stormbell Warden**, Thunderhorn Ram, Sunfeather Drake
- Elaris: Cinder Fox, Blight Antler
- Vespera: Prism Thornling, Arc Wisp

## 4. Frames that change size or position between steps (the creature jumps or shrinks as it walks)

- Sky Isles: **The Featherfall Matriarch**, **The Zenith Roc**, Gale Harpy (wings out in one frame, folded small in the next)
- Chronospire: Tick Moth, Lag Wraith (small in the frame)
- Neon Aftermath: Lunar Enforcer (small in the frame)

## 5. Battle poses (attack and hurt): every enemy except the Sunwrapped Revenant

All 55 others only walk. Bosses first: Thorn Warden, The Crown Sentinel, Lunar Enforcer, The Sun Pharaoh, The Cistern Warden,
The Noon Toller, The Zenith Roc, The Stormbell Warden, The Featherfall Matriarch, The Bloom Tyrant, The Tidebound Warden,
The Gale Sovereign, The Tempest Colossus, The Arc Sentinel, The Resonant Phantom, The Mainspring Colossus, The Clockwarden,
The Paradox Twin, The Hollow Hour, The Chronarch.

## Looks fine, no change needed

Neon Aftermath: Ember Jackal, Circuit Thornling, Riot Sentinel, Phase Shade, Data Wisp, Thorn Warden, The Crown Sentinel.
Solaris: Sunwrapped Revenant, Dust Devil, The Cistern Warden. Elaris: Drowned Heron, The Bloom Tyrant,
Storm Moth. Vespera: Ion Shade, The Arc Sentinel. Chronospire: Brass Sentry, The Mainspring Colossus, Rust Wisp,
The Clockwarden, The Paradox Twin, The Hollow Hour.
